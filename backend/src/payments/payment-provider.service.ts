import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentProvider } from "../common/enums/payment-provider.enum";
import { LiqPayPaymentProviderService } from "./providers/liqpay-payment-provider.service";
import { MockPaymentProviderService } from "./providers/mock-payment-provider.service";
import { StripePaymentProviderService } from "./providers/stripe-payment-provider.service";
import { PaymentProviderAdapter } from "./providers/payment-provider.types";

@Injectable()
export class PaymentProviderService {
  private readonly adapters: Map<PaymentProvider, PaymentProviderAdapter>;

  constructor(
    private readonly configService: ConfigService,
    mockProvider: MockPaymentProviderService,
    liqPayProvider: LiqPayPaymentProviderService,
    stripeProvider: StripePaymentProviderService,
  ) {
    this.adapters = new Map<PaymentProvider, PaymentProviderAdapter>([
      [mockProvider.provider, mockProvider],
      [liqPayProvider.provider, liqPayProvider],
      [stripeProvider.provider, stripeProvider],
    ]);
  }

  resolve(
    provider?: PaymentProvider | string,
    options?: {
      strict?: boolean;
    },
  ) {
    const target =
      (provider as PaymentProvider | undefined) ??
      (this.configService.get<PaymentProvider>("payments.defaultProvider") ?? PaymentProvider.Mock);

    const adapter = this.adapters.get(target);
    if (!adapter) {
      throw new BadRequestException(`Payment provider ${target} is not supported`);
    }

    if (!adapter.isEnabled()) {
      if (options?.strict) {
        throw new BadRequestException(`Payment provider ${target} is not configured`);
      }

      if (target !== PaymentProvider.Mock) {
        return this.adapters.get(PaymentProvider.Mock)!;
      }

      throw new BadRequestException(`Payment provider ${target} is not configured`);
    }

    return adapter;
  }
}
