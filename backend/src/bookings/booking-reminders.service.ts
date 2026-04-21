import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Repository } from "typeorm";
import { BookingStatus } from "../common/enums/booking-status.enum";
import { TelegramService } from "../telegram/telegram.service";
import { BookingEntity } from "./booking.entity";

interface ReminderWindow {
  key: "24h" | "2h";
  fromOffsetMs: number;
  toOffsetMs: number;
  property: "reminder24hSentAt" | "reminder2hSentAt";
  dbColumn: "reminder_24h_sent_at" | "reminder_2h_sent_at";
  label: string;
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  {
    key: "24h",
    fromOffsetMs: 23 * 60 * 60 * 1000 + 45 * 60 * 1000,
    toOffsetMs: 24 * 60 * 60 * 1000 + 15 * 60 * 1000,
    property: "reminder24hSentAt",
    dbColumn: "reminder_24h_sent_at",
    label: "24 hours",
  },
  {
    key: "2h",
    fromOffsetMs: 105 * 60 * 1000,
    toOffsetMs: 135 * 60 * 1000,
    property: "reminder2hSentAt",
    dbColumn: "reminder_2h_sent_at",
    label: "2 hours",
  },
];

@Injectable()
export class BookingRemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingRemindersService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly telegramService: TelegramService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.flushUpcomingReminders();
    }, 60_000);

    void this.flushUpcomingReminders();
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async flushUpcomingReminders() {
    for (const window of REMINDER_WINDOWS) {
      await this.processWindow(window);
    }
  }

  private async processWindow(window: ReminderWindow) {
    const now = Date.now();
    const from = new Date(now + window.fromOffsetMs);
    const to = new Date(now + window.toOffsetMs);

    const bookings = await this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.barber", "barber")
      .leftJoinAndSelect("booking.service", "service")
      .where("booking.status IN (:...statuses)", {
        statuses: [BookingStatus.Pending, BookingStatus.Confirmed],
      })
      .andWhere("booking.start_time BETWEEN :from AND :to", { from, to })
      .andWhere(`booking.${window.dbColumn} IS NULL`)
      .orderBy("booking.start_time", "ASC")
      .getMany();

    for (const booking of bookings) {
      try {
        await this.telegramService.sendUpcomingReminderAlert(booking, window.label);
        await this.telegramService.sendClientReminder(booking, window.label);

        booking[window.property] = new Date();
        await this.bookingRepository.save(booking);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown reminder error";
        this.logger.warn(
          `Failed to process ${window.key} reminder for booking ${booking.id}: ${message}`,
        );
      }
    }
  }
}
