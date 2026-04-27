import { Module } from "@nestjs/common";
import { BookingHoldsModule } from "./booking-holds/booking-holds.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { WorkerRunnerService } from "./worker-runner.service";

@Module({
  imports: [BookingsModule, BookingHoldsModule, PaymentsModule],
  providers: [WorkerRunnerService],
})
export class WorkerModule {}
