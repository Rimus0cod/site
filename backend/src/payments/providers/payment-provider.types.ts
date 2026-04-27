import { BookingHoldEntity } from "../../booking-holds/booking-hold.entity";
import { PaymentProvider } from "../../common/enums/payment-provider.enum";
import { PaymentStatus } from "../../common/enums/payment-status.enum";
import { PaymentEntity } from "../payment.entity";

export interface CheckoutRedirectPayload {
  url: string;
  method: "GET" | "POST";
  fields?: Record<string, string>;
}

export interface ProviderCheckoutSession {
  provider: PaymentProvider;
  checkoutRef?: string | null;
  paymentRef?: string | null;
  redirect?: CheckoutRedirectPayload | null;
  rawPayload?: Record<string, unknown> | null;
}

export interface ProviderWebhookInput {
  payload: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string | null;
}

export interface NormalizedProviderEvent {
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  checkoutRef: string;
  paymentRef?: string | null;
  status: PaymentStatus;
  rawPayload: Record<string, unknown>;
}

export interface ProviderPaymentSnapshot {
  provider: PaymentProvider;
  checkoutRef: string;
  paymentRef?: string | null;
  status: PaymentStatus;
  rawPayload: Record<string, unknown>;
}

export interface ProviderRefundResult {
  provider: PaymentProvider;
  refundRef?: string | null;
  status: PaymentStatus;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  isEnabled(): boolean;
  createCheckoutSession(params: {
    payment: PaymentEntity;
    hold: BookingHoldEntity;
    returnUrls: {
      successUrl: string;
      cancelUrl: string;
    };
  }): Promise<ProviderCheckoutSession>;
  parseWebhook(input: ProviderWebhookInput): Promise<NormalizedProviderEvent>;
  fetchPaymentStatus(payment: PaymentEntity): Promise<ProviderPaymentSnapshot | null>;
  refundPayment(params: { payment: PaymentEntity; amount: string }): Promise<ProviderRefundResult>;
}
