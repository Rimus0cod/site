import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { BookingEntity } from "../bookings/booking.entity";
import { TelegramApiClient, TelegramMessage } from "./telegram-api.client";
import { TelegramProfileEntity } from "./telegram-profile.entity";

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramApiClient | null = null;
  private chatId: string;
  private mode: "disabled" | "outbound" | "polling";

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(TelegramProfileEntity)
    private readonly telegramProfileRepository: Repository<TelegramProfileEntity>,
  ) {
    this.chatId = this.configService.get<string>("telegram.adminChatId", "");
    this.mode = this.configService.get<"disabled" | "outbound" | "polling">(
      "telegram.mode",
      "outbound",
    );
  }

  onModuleInit() {
    const token = this.configService.get<string>("telegram.botToken", "");
    if (!token || this.mode === "disabled") {
      this.logger.log("Telegram is disabled for this process.");
      return;
    }

    this.bot = new TelegramApiClient(token, this.logger);

    if (this.mode === "polling") {
      this.bot.startPolling((message) => this.handleIncomingMessage(message));
      this.logger.log("Telegram polling is enabled in the current process.");
      return;
    }

    this.logger.log("Telegram outbound mode is enabled without polling.");
  }

  async onModuleDestroy() {
    if (this.bot && this.mode === "polling") {
      await this.bot.stopPolling();
    }
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
      this.logger.warn(`Failed to send Telegram DM to @${normalizedUsername}. ${message}`);
    }
  }

  private async handleIncomingMessage(message: TelegramMessage) {
    await this.registerTelegramProfile(message);

    const text = message.text?.trim();
    if (!text) {
      return;
    }

    const normalizedText = text.toLowerCase();
    if (/^\/start(?:\s+.*)?$/i.test(text)) {
      await this.handleStartCommand(message);
      return;
    }

    if (
      normalizedText === "\u043c\u043e\u0438 \u0437\u0430\u043f\u0438\u0441\u0438" ||
      normalizedText === "my bookings" ||
      normalizedText === "bookings" ||
      /^\/(?:bookings|mybookings)(?:@[\w_]+)?$/i.test(text)
    ) {
      await this.sendBookingsForTelegramUser(message);
    }
  }

  private async handleStartCommand(message: TelegramMessage) {
    if (!this.bot) {
      return;
    }

    const username = this.normalizeUsername(message.from?.username);
    const intro = [
      "BarberBook bot is connected.",
      username
        ? `Your Telegram profile is linked as @${username}.`
        : "Set a Telegram username in your Telegram profile so I can match your bookings.",
      "Use /bookings or send '\u043c\u043e\u0438 \u0437\u0430\u043f\u0438\u0441\u0438' to get your current bookings.",
    ].join("\n");

    await this.bot.sendMessage(message.chat.id, intro);
    await this.sendBookingsForTelegramUser(message);
  }

  private async registerTelegramProfile(message: TelegramMessage) {
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

  private async sendBookingsForTelegramUser(message: TelegramMessage) {
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
