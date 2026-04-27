import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BarbersModule } from "../barbers/barbers.module";
import { BookingsModule } from "../bookings/bookings.module";
import { ClientAuthModule } from "../client-auth/client-auth.module";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { PaymentEntity } from "../payments/payment.entity";
import { ServicesModule } from "../services/services.module";
import { BookingHoldEntity } from "./booking-hold.entity";
import { BookingHoldsController } from "./booking-holds.controller";
import { BookingHoldExpirationService } from "./booking-hold-expiration.service";
import { BookingHoldsService } from "./booking-holds.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingHoldEntity, PaymentEntity]),
    BarbersModule,
    ClientAuthModule,
    ServicesModule,
    forwardRef(() => BookingsModule),
  ],
  controllers: [BookingHoldsController],
  providers: [BookingHoldsService, BookingHoldExpirationService, PublicThrottleGuard],
  exports: [BookingHoldsService, BookingHoldExpirationService],
})
export class BookingHoldsModule {}
