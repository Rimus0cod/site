import { Injectable, Logger } from "@nestjs/common";
import { BookingsService } from "../bookings/bookings.service";

@Injectable()
export class BookingHoldExpirationService {
  private readonly logger = new Logger(BookingHoldExpirationService.name);

  constructor(private readonly bookingsService: BookingsService) {}

  async runExpirationCycle() {
    try {
      const expiredCount = await this.bookingsService.expireStaleHolds();
      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} stale booking hold(s).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown hold expiration error";
      this.logger.warn(`Failed to expire stale booking holds: ${message}`);
    }
  }
}
