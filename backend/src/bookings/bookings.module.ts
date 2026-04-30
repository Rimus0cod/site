import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminAuditLogModule } from "../admin-audit/admin-audit-log.module";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BarbersModule } from "../barbers/barbers.module";
import { ClientAuthModule } from "../client-auth/client-auth.module";
import { ScheduleModule } from "../schedule/schedule.module";
import { ScheduleExceptionEntity } from "../schedule/schedule-exception.entity";
import { ServicesModule } from "../services/services.module";
import { TelegramModule } from "../telegram/telegram.module";
import { PaymentEntity } from "../payments/payment.entity";
import { RefundEntity } from "../payments/refund.entity";
import { PaymentsModule } from "../payments/payments.module";
import { BookingEntity } from "./booking.entity";
import { BookingRemindersService } from "./booking-reminders.service";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingHoldEntity,
      PaymentEntity,
      RefundEntity,
      WorkScheduleEntity,
      ScheduleExceptionEntity,
    ]),
    AdminAuditLogModule,
    BarbersModule,
    ClientAuthModule,
    ServicesModule,
    ScheduleModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => TelegramModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingRemindersService, PublicThrottleGuard],
  exports: [BookingsService, BookingRemindersService],
})
export class BookingsModule {}
