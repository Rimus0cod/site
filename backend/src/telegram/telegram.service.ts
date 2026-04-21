import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import TelegramBot from "node-telegram-bot-api";
import { Repository } from "typeorm";
import { BookingEntity } from "../bookings/booking.entity";
import { TelegramProfileEntity } from "./telegram-profile.entity";

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private chatId: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(TelegramProfileEntity)
    private readonly telegramProfileRepository: Repository<TelegramProfileEntity>,
  ) {
    this.chatId = this.configService.get<string>("telegram.adminChatId", "");
  }

  onModuleInit() {
    const token = this.configService.get<string>("telegram.botToken", "");
    if (!token) {
      this.logger.log("Telegram bot token is not configured; notifications are disabled.");
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.registerBotHandlers();
  }

  async sendNewBookingAlert(booking: BookingEntity) {
    await this.sendMessage(this.buildNewBookingMessage(booking));
  }

  async sendClientBookingAlert(booking: BookingEntity) {
    if (!booking.clientTelegramUsername) {
      return;
    }

    await this.sendDirectMessage(
      booking.clientTelegramUsername,
      [
        "Your booking request has been received.",
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `Date: ${this.formatDate(booking.startTime)}`,
        `Time: ${this.formatTime(booking.startTime)}-${this.formatTime(booking.endTime)}`,
        `Status: ${booking.status}`,
        booking.notes ? `Notes: ${booking.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  async sendStatusUpdateAlert(booking: BookingEntity) {
    await this.sendMessage(
      [
        "Booking status updated",
        `Client: ${booking.clientName}`,
        `Phone: ${booking.clientPhone}`,
        booking.clientTelegramUsername ? `Telegram: @${booking.clientTelegramUsername}` : null,
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `Status: ${booking.status}`,
        `Starts: ${booking.startTime.toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  async sendRescheduleAlert(booking: BookingEntity) {
    await this.sendMessage(
      [
        "Booking rescheduled",
        `Client: ${booking.clientName}`,
        `Phone: ${booking.clientPhone}`,
        booking.clientTelegramUsername ? `Telegram: @${booking.clientTelegramUsername}` : null,
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `New date: ${this.formatDate(booking.startTime)}`,
        `New time: ${this.formatTime(booking.startTime)}-${this.formatTime(booking.endTime)}`,
        `Status: ${booking.status}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  async sendClientRescheduleAlert(booking: BookingEntity) {
    if (!booking.clientTelegramUsername) {
      return;
    }

    await this.sendDirectMessage(
      booking.clientTelegramUsername,
      [
        "Your booking has been rescheduled.",
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `Date: ${this.formatDate(booking.startTime)}`,
        `Time: ${this.formatTime(booking.startTime)}-${this.formatTime(booking.endTime)}`,
        `Status: ${booking.status}`,
      ].join("\n"),
    );
  }

  async sendClientStatusUpdate(booking: BookingEntity) {
    if (!booking.clientTelegramUsername) {
      return;
    }

    await this.sendDirectMessage(
      booking.clientTelegramUsername,
      [
        "Your booking status has been updated.",
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `Date: ${this.formatDate(booking.startTime)}`,
        `Time: ${this.formatTime(booking.startTime)}-${this.formatTime(booking.endTime)}`,
        `Status: ${booking.status}`,
      ].join("\n"),
    );
  }

  async sendUpcomingReminderAlert(booking: BookingEntity, label: string) {
    await this.sendMessage(
      [
        `Upcoming booking in ${label}`,
        `Client: ${booking.clientName}`,
        `Phone: ${booking.clientPhone}`,
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `Date: ${this.formatDate(booking.startTime)}`,
        `Time: ${this.formatTime(booking.startTime)}-${this.formatTime(booking.endTime)}`,
        `Status: ${booking.status}`,
      ].join("\n"),
    );
  }

  async sendClientReminder(booking: BookingEntity, label: string) {
    if (!booking.clientTelegramUsername) {
      return;
    }

    await this.sendDirectMessage(
      booking.clientTelegramUsername,
      [
        `Reminder: your booking starts in ${label}.`,
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `Date: ${this.formatDate(booking.startTime)}`,
        `Time: ${this.formatTime(booking.startTime)}-${this.formatTime(booking.endTime)}`,
      ].join("\n"),
    );
  }

  private async sendMessage(text: string) {
    if (!this.bot || !this.chatId) {
      return;
    }

    try {
      await this.bot.sendMessage(this.chatId, text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Telegram error";
      this.logger.error(`Failed to send Telegram message: ${message}`);
    }
  }

  private async sendDirectMessage(username: string, text: string) {
    if (!this.bot) {
      return;
    }

    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) {
      return;
    }

    const profile = await this.telegramProfileRepository.findOne({
      where: { username: normalizedUsername },
    });

    if (!profile) {
      this.logger.warn(
        `No Telegram profile linked for @${normalizedUsername}. The client needs to start the bot first.`,
      );
      return;
    }

    try {
      await this.bot.sendMessage(profile.chatId, text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Telegram error";
      this.logger.warn(
        `Failed to send Telegram DM to @${normalizedUsername}. ${message}`,
      );
    }
  }

  private registerBotHandlers() {
    if (!this.bot) {
      return;
    }

    this.bot.on("message", (message) => {
      void this.registerTelegramProfile(message);

      const text = message.text?.trim().toLowerCase();
      if (text === "мои записи" || text === "my bookings" || text === "bookings") {
        void this.sendBookingsForTelegramUser(message);
      }
    });

    this.bot.onText(/^\/start(?:\s+.*)?$/, (message) => {
      void this.handleStartCommand(message);
    });

    this.bot.onText(/^\/(?:bookings|mybookings)(?:@[\w_]+)?$/i, (message) => {
      void this.sendBookingsForTelegramUser(message);
    });
  }

  private async handleStartCommand(message: TelegramBot.Message) {
    if (!this.bot) {
      return;
    }

    const username = this.normalizeUsername(message.from?.username);
    const intro = [
      "BarberBook bot is connected.",
      username
        ? `Your Telegram profile is linked as @${username}.`
        : "Set a Telegram username in your Telegram profile so I can match your bookings.",
      "Use /bookings or send 'мои записи' to get your current bookings.",
    ].join("\n");

    await this.bot.sendMessage(message.chat.id, intro);
    await this.sendBookingsForTelegramUser(message);
  }

  private async registerTelegramProfile(message: TelegramBot.Message) {
    const username = this.normalizeUsername(message.from?.username);
    if (!username) {
      return;
    }

    const chatId = String(message.chat.id);
    const existing = await this.telegramProfileRepository.findOne({
      where: { username },
    });

    if (existing) {
      if (existing.chatId !== chatId) {
        existing.chatId = chatId;
        await this.telegramProfileRepository.save(existing);
      }
      return;
    }

    await this.telegramProfileRepository.save(
      this.telegramProfileRepository.create({
        username,
        chatId,
      }),
    );
  }

  private async sendBookingsForTelegramUser(message: TelegramBot.Message) {
    if (!this.bot) {
      return;
    }

    const username = this.normalizeUsername(message.from?.username);
    if (!username) {
      await this.bot.sendMessage(
        message.chat.id,
        "I can't identify you without a Telegram username. Add one in Telegram settings, then try /bookings again.",
      );
      return;
    }

    const bookings = await this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.barber", "barber")
      .leftJoinAndSelect("booking.service", "service")
      .where("LOWER(booking.client_telegram_username) = :username", { username })
      .orderBy("booking.start_time", "ASC")
      .getMany();

    if (bookings.length === 0) {
      await this.bot.sendMessage(
        message.chat.id,
        `No bookings found for @${username}. Make sure the same Telegram username was entered in the booking form.`,
      );
      return;
    }

    await this.bot.sendMessage(
      message.chat.id,
      `Found ${bookings.length} booking(s) for @${username}. Sending all current cards below.`,
    );

    for (const booking of bookings) {
      await this.bot.sendMessage(message.chat.id, this.buildClientBookingCard(booking));
    }
  }

  private buildNewBookingMessage(booking: BookingEntity) {
    return [
      "New booking",
      `Client: ${booking.clientName}`,
      `Phone: ${booking.clientPhone}`,
      booking.clientTelegramUsername ? `Telegram: @${booking.clientTelegramUsername}` : null,
      `Service: ${booking.service?.name ?? booking.serviceId}`,
      `Barber: ${booking.barber?.name ?? booking.barberId}`,
      `Starts: ${booking.startTime.toISOString()}`,
      `Ends: ${booking.endTime.toISOString()}`,
      `Status: ${booking.status}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildClientBookingCard(booking: BookingEntity) {
    return [
      "Booking card",
      `Service: ${booking.service?.name ?? booking.serviceId}`,
      `Barber: ${booking.barber?.name ?? booking.barberId}`,
      `Date: ${this.formatDate(booking.startTime)}`,
      `Time: ${this.formatTime(booking.startTime)}-${this.formatTime(booking.endTime)}`,
      `Status: ${booking.status}`,
      booking.notes ? `Notes: ${booking.notes}` : null,
      `Booking ID: ${booking.id}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private normalizeUsername(username?: string | null) {
    if (!username) {
      return null;
    }

    const normalized = username.trim().replace(/^@+/, "").toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private formatTime(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
}
