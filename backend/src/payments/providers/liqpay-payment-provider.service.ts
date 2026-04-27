import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
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

const LIQPAY_CHECKOUT_URL = "https://www.liqpay.ua/api/3/checkout";
const LIQPAY_API_URL = "https://www.liqpay.ua/api/request";

@Injectable()
export class LiqPayPaymentProviderService implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.LiqPay;

  constructor(private readonly configService: ConfigService) {}

  isEnabled() {
    return Boolean(this.publicKey && this.privateKey);
  }

  async createCheckoutSession(params: {
    payment: {
      providerCheckoutRef: string;
      amount: string;
      currency: string;
    };
    hold: {
      id: string;
      clientName: string;
      clientPhone: string;
      service?: { name?: string | null } | null;
      startTime: Date;
    };
    returnUrls: {
      successUrl: string;
      cancelUrl: string;
    };
  }): Promise<ProviderCheckoutSession> {
    if (!this.isEnabled()) {
      throw new BadRequestException("LiqPay provider is not configured");
    }

    const payload = this.encodePayload({
      version: 3,
      public_key: this.publicKey,
      action: "pay",
      amount: params.payment.amount,
      currency: params.payment.currency,
      description: this.buildDescription(params.hold.clientName, params.hold.service?.name, params.hold.startTime),
      order_id: params.payment.providerCheckoutRef,
      language: "uk",
      sandbox: this.sandbox ? 1 : 0,
      server_url: `${this.backendPublicUrl}/api/v1/payments/webhooks/${this.provider}`,
      result_url: params.returnUrls.successUrl,
      customer: params.hold.clientPhone,
      info: JSON.stringify({
        holdId: params.hold.id,
      }),
    });

    return {
      provider: this.provider,
      checkoutRef: params.payment.providerCheckoutRef,
      redirect: {
        url: LIQPAY_CHECKOUT_URL,
        method: "POST",
        fields: payload,
      },
      rawPayload: {
        checkoutUrl: LIQPAY_CHECKOUT_URL,
      },
    };
  }

  async parseWebhook({ payload }: ProviderWebhookInput): Promise<NormalizedProviderEvent> {
    if (!this.isEnabled()) {
      throw new BadRequestException("LiqPay provider is not configured");
    }

    const data = String(payload.data ?? "");
    const signature = String(payload.signature ?? "");

    if (!data || !signature) {
      throw new BadRequestException("LiqPay callback payload is incomplete");
    }

    const expectedSignature = this.signData(data);
    if (expectedSignature !== signature) {
      throw new BadRequestException("LiqPay callback signature is invalid");
    }

    const decoded = this.decodeData(data);
    const checkoutRef = String(decoded.order_id ?? "");
    const paymentRef = decoded.payment_id ? String(decoded.payment_id) : null;
    const rawStatus = String(decoded.status ?? "");
    const eventFingerprint = [
      paymentRef ?? checkoutRef,
      rawStatus || "unknown",
      String(decoded.end_date ?? decoded.create_date ?? ""),
    ].join(":");

    return {
      provider: this.provider,
      providerEventId: eventFingerprint,
      eventType: `payment.${rawStatus || "updated"}`,
      checkoutRef,
      paymentRef,
      status: this.normalizeStatus(rawStatus),
      rawPayload: decoded,
    };
  }

  async fetchPaymentStatus(payment: {
    providerCheckoutRef: string;
  }): Promise<ProviderPaymentSnapshot | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const response = await this.postApi({
      version: 3,
      action: "status",
      public_key: this.publicKey,
      order_id: payment.providerCheckoutRef,
    });

    if (!response || typeof response !== "object") {
      return null;
    }

    return {
      provider: this.provider,
      checkoutRef: String(response.order_id ?? payment.providerCheckoutRef),
      paymentRef: response.payment_id ? String(response.payment_id) : null,
      status: this.normalizeStatus(String(response.status ?? "")),
      rawPayload: response,
    };
  }

  async refundPayment(params: {
    payment: { providerCheckoutRef: string };
    amount: string;
  }): Promise<ProviderRefundResult> {
    if (!this.isEnabled()) {
      throw new BadRequestException("LiqPay provider is not configured");
    }

    const response = await this.postApi({
      version: 3,
      action: "refund",
      public_key: this.publicKey,
      order_id: params.payment.providerCheckoutRef,
      amount: params.amount,
    });

    return {
      provider: this.provider,
      refundRef: response?.refund_id ? String(response.refund_id) : params.payment.providerCheckoutRef,
      status: this.normalizeStatus(String(response?.status ?? "")),
      rawPayload: response,
    };
  }

  private get publicKey() {
    return this.configService.get<string>("payments.liqpay.publicKey", "");
  }

  private get privateKey() {
    return this.configService.get<string>("payments.liqpay.privateKey", "");
  }

  private get sandbox() {
    return this.configService.get<boolean>("payments.liqpay.sandbox", false);
  }

  private get backendPublicUrl() {
    return this.configService.get<string>("app.backendPublicUrl", "http://localhost:3001");
  }

  private buildDescription(clientName: string, serviceName: string | null | undefined, startTime: Date) {
    const serviceLabel = serviceName ? `${serviceName}` : "Barber booking";
    return `${serviceLabel} for ${clientName} on ${startTime.toISOString()}`;
  }

  private encodePayload(params: Record<string, unknown>) {
    const data = Buffer.from(JSON.stringify(params)).toString("base64");
    const signature = this.signData(data);

    return {
      data,
      signature,
    };
  }

  private decodeData(data: string) {
    return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as Record<string, unknown>;
  }

  private signData(data: string) {
    return createHash("sha1")
      .update(`${this.privateKey}${data}${this.privateKey}`)
      .digest("base64");
  }

  private normalizeStatus(status: string) {
    switch (status.toLowerCase()) {
      case "success":
      case "subscribed":
        return PaymentStatus.Paid;
      case "reversed":
        return PaymentStatus.Refunded;
      case "error":
      case "failure":
      case "unsubscribed":
        return PaymentStatus.Failed;
      default:
        return PaymentStatus.Pending;
    }
  }

  private async postApi(params: Record<string, unknown>) {
    const body = this.encodePayload(params);

    const response = await fetch(LIQPAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      throw new BadRequestException(`LiqPay API request failed with status ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }
}
