import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BookingHoldsModule } from "../booking-holds/booking-holds.module";
import { BookingsModule } from "../bookings/bookings.module";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { LiqPayPaymentProviderService } from "./providers/liqpay-payment-provider.service";
import { MockPaymentProviderService } from "./providers/mock-payment-provider.service";
import { StripePaymentProviderService } from "./providers/stripe-payment-provider.service";
import { PaymentEventEntity } from "./payment-event.entity";
import { PaymentEntity } from "./payment.entity";
import { PaymentProviderService } from "./payment-provider.service";
import { PaymentReconciliationService } from "./payment-reconciliation.service";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { RefundEntity } from "./refund.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PaymentEntity, PaymentEventEntity, RefundEntity]),
    forwardRef(() => BookingHoldsModule),
    forwardRef(() => BookingsModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProviderService,
    MockPaymentProviderService,
    LiqPayPaymentProviderService,
    StripePaymentProviderService,
    PaymentReconciliationService,
    PublicThrottleGuard,
  ],
  exports: [PaymentsService, PaymentProviderService, PaymentReconciliationService],
})
export class PaymentsModule {}
