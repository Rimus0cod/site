import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BarbersModule } from "../barbers/barbers.module";
import { ScheduleModule } from "../schedule/schedule.module";
import { ScheduleExceptionEntity } from "../schedule/schedule-exception.entity";
import { ServicesModule } from "../services/services.module";
import { TelegramModule } from "../telegram/telegram.module";
import { BookingEntity } from "./booking.entity";
import { BookingRemindersService } from "./booking-reminders.service";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, WorkScheduleEntity, ScheduleExceptionEntity]),
    BarbersModule,
    ServicesModule,
    ScheduleModule,
    forwardRef(() => TelegramModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingRemindersService, PublicThrottleGuard],
  exports: [BookingsService],
})
export class BookingsModule {}
