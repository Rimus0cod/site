import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BarbersModule } from "../barbers/barbers.module";
import { ScheduleModule } from "../schedule/schedule.module";
import { ServicesModule } from "../services/services.module";
import { TelegramModule } from "../telegram/telegram.module";
import { BookingEntity } from "./booking.entity";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, WorkScheduleEntity]),
    BarbersModule,
    ServicesModule,
    ScheduleModule,
    forwardRef(() => TelegramModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}

