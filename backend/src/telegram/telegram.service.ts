import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import TelegramBot from "node-telegram-bot-api";
import { BookingEntity } from "../bookings/booking.entity";

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private chatId: string;

  constructor(private readonly configService: ConfigService) {
    this.chatId = this.configService.get<string>("telegram.adminChatId", "");
  }

  onModuleInit() {
    const token = this.configService.get<string>("telegram.botToken", "");
    if (!token) {
      this.logger.log("Telegram bot token is not configured; notifications are disabled.");
      return;
    }

    this.bot = new TelegramBot(token);
  }

  async sendNewBookingAlert(booking: BookingEntity) {
    await this.sendMessage(this.buildNewBookingMessage(booking));
  }

  async sendStatusUpdateAlert(booking: BookingEntity) {
    await this.sendMessage(
      [
        "Booking status updated",
        `Client: ${booking.clientName}`,
        `Phone: ${booking.clientPhone}`,
        `Service: ${booking.service?.name ?? booking.serviceId}`,
        `Barber: ${booking.barber?.name ?? booking.barberId}`,
        `Status: ${booking.status}`,
        `Starts: ${booking.startTime.toISOString()}`,
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

  private buildNewBookingMessage(booking: BookingEntity) {
    return [
      "New booking",
      `Client: ${booking.clientName}`,
      `Phone: ${booking.clientPhone}`,
      `Service: ${booking.service?.name ?? booking.serviceId}`,
      `Barber: ${booking.barber?.name ?? booking.barberId}`,
      `Starts: ${booking.startTime.toISOString()}`,
      `Ends: ${booking.endTime.toISOString()}`,
      `Status: ${booking.status}`,
    ].join("\n");
  }
}
