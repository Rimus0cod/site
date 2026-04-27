import { Injectable } from "@nestjs/common";
import { PaymentProvider } from "../../common/enums/payment-provider.enum";
import { PaymentStatus } from "../../common/enums/payment-status.enum";
import {
  NormalizedProviderEvent,
  PaymentProviderAdapter,
  ProviderCheckoutSession,
  ProviderPaymentSnapshot,
  ProviderRefundResult,
  ProviderWebhookInput,
} from "./payment-provider.types";

@Injectable()
export class MockPaymentProviderService implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.Mock;

  isEnabled() {
    return true;
  }

  async createCheckoutSession(): Promise<ProviderCheckoutSession> {
    return {
      provider: this.provider,
      redirect: null,
      rawPayload: null,
    };
  }

  async parseWebhook({ payload }: ProviderWebhookInput): Promise<NormalizedProviderEvent> {
    return {
      provider: this.provider,
      providerEventId: String(payload.eventId ?? payload.id ?? ""),
      eventType: String(payload.eventType ?? payload.type ?? "payment.updated"),
      checkoutRef: String(payload.checkoutRef ?? ""),
      paymentRef: payload.paymentRef ? String(payload.paymentRef) : null,
      status: this.normalizeStatus(String(payload.status ?? "")),
      rawPayload: payload,
    };
  }

  async fetchPaymentStatus(): Promise<ProviderPaymentSnapshot | null> {
    return null;
  }

  async refundPayment(params: { payment: { providerCheckoutRef: string; providerPaymentRef?: string | null }; amount: string }): Promise<ProviderRefundResult> {
    return {
      provider: this.provider,
      refundRef: `mock_refund_${params.payment.providerCheckoutRef}`,
      status: PaymentStatus.Refunded,
      rawPayload: {
        provider: this.provider,
        checkoutRef: params.payment.providerCheckoutRef,
        paymentRef: params.payment.providerPaymentRef ?? null,
        amount: params.amount,
        status: PaymentStatus.Refunded,
      },
    };
  }

  private normalizeStatus(status: string) {
    switch (status.toLowerCase()) {
      case PaymentStatus.Paid:
        return PaymentStatus.Paid;
      case PaymentStatus.Refunded:
      case PaymentStatus.PartialRefund:
        return status.toLowerCase() as PaymentStatus;
      default:
        return PaymentStatus.Failed;
    }
  }
}
