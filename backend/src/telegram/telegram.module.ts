import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BookingEntity } from "../bookings/booking.entity";
import { TelegramProfileEntity } from "./telegram-profile.entity";
import { TelegramService } from "./telegram.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity, TelegramProfileEntity])],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
