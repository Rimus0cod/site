import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
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
export class StripePaymentProviderService implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.Stripe;
  private stripeClient: InstanceType<typeof Stripe> | null = null;

  constructor(private readonly configService: ConfigService) {}

  isEnabled() {
    return Boolean(this.secretKey && this.webhookSecret);
  }

  async createCheckoutSession(params: {
    payment: {
      id: string;
      providerCheckoutRef: string;
      amountMinor: number;
      currency: string;
    };
    hold: {
      id: string;
      clientName: string;
      clientPhone: string;
      service?: { name?: string | null } | null;
      startTime: Date;
      expiresAt: Date;
    };
    returnUrls: {
      successUrl: string;
      cancelUrl: string;
    };
  }): Promise<ProviderCheckoutSession> {
    try {
      const stripe = this.getClient();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: params.returnUrls.successUrl,
        cancel_url: params.returnUrls.cancelUrl,
        client_reference_id: params.payment.id,
        metadata: {
          holdId: params.hold.id,
          paymentId: params.payment.id,
          providerCheckoutRef: params.payment.providerCheckoutRef,
        },
        payment_intent_data: {
          metadata: {
            holdId: params.hold.id,
            paymentId: params.payment.id,
            providerCheckoutRef: params.payment.providerCheckoutRef,
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: params.payment.currency.toLowerCase(),
              unit_amount: params.payment.amountMinor,
              product_data: {
                name: params.hold.service?.name?.trim() || "Barber booking deposit",
                description: this.buildDescription(
                  params.hold.clientName,
                  params.hold.clientPhone,
                  params.hold.startTime,
                ),
              },
            },
          },
        ],
      });

      if (!session.url) {
        throw new BadRequestException("Stripe checkout session URL is missing");
      }

      return {
        provider: this.provider,
        checkoutRef: session.id,
        paymentRef: this.getPaymentIntentId(session.payment_intent),
        redirect: {
          url: session.url,
          method: "GET",
        },
        rawPayload: {
          checkoutSessionId: session.id,
          paymentIntentId: this.getPaymentIntentId(session.payment_intent),
        },
      };
    } catch (error) {
      throw this.toBadRequest(error);
    }
  }

  async parseWebhook(input: ProviderWebhookInput): Promise<NormalizedProviderEvent> {
    const stripe = this.getClient();
    const signature = input.headers?.["stripe-signature"];
    const rawBody = input.rawBody;

    if (!signature || Array.isArray(signature) || !rawBody) {
      throw new BadRequestException("Stripe webhook signature or raw body is missing");
    }

    let event: any;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature";
      throw new BadRequestException(message);
    }

    if (event.type.startsWith("checkout.session.")) {
      const session = event.data.object as Record<string, any>;
      return {
        provider: this.provider,
        providerEventId: event.id,
        eventType: event.type,
        checkoutRef: String(session.id ?? ""),
        paymentRef: this.getPaymentIntentId(session.payment_intent),
        status: this.mapCheckoutSessionStatus(event.type, session),
        rawPayload: event as unknown as Record<string, unknown>,
      };
    }

    if (event.type.startsWith("payment_intent.")) {
      const paymentIntent = event.data.object as Record<string, any>;
      return {
        provider: this.provider,
        providerEventId: event.id,
        eventType: event.type,
        checkoutRef: String(paymentIntent.metadata?.providerCheckoutRef ?? ""),
        paymentRef: String(paymentIntent.id ?? ""),
        status: this.mapPaymentIntentStatus(event.type, String(paymentIntent.status ?? "")),
        rawPayload: event as unknown as Record<string, unknown>,
      };
    }

    throw new BadRequestException(`Stripe event ${event.type} is not supported`);
  }

  async fetchPaymentStatus(payment: {
    providerCheckoutRef: string;
  }): Promise<ProviderPaymentSnapshot | null> {
    try {
      const stripe = this.getClient();
      const session = await stripe.checkout.sessions.retrieve(payment.providerCheckoutRef, {
        expand: ["payment_intent"],
      });

      return {
        provider: this.provider,
        checkoutRef: session.id,
        paymentRef: this.getPaymentIntentId(session.payment_intent),
        status: this.normalizeStripeSessionStatus(session.status, session.payment_status),
        rawPayload: session as unknown as Record<string, unknown>,
      };
    } catch (error) {
      if (this.isMissingCheckoutSessionError(error)) {
        return {
          provider: this.provider,
          checkoutRef: payment.providerCheckoutRef,
          paymentRef: null,
          status: PaymentStatus.Failed,
          rawPayload: {
            error: error instanceof Error ? error.message : "Stripe checkout session not found",
            code: "checkout_session_missing",
          },
        };
      }

      throw this.toBadRequest(error);
    }
  }

  async refundPayment(params: {
    payment: { providerPaymentRef?: string | null; amountMinor: number };
    amount: string;
  }): Promise<ProviderRefundResult> {
    try {
      const stripe = this.getClient();

      if (!params.payment.providerPaymentRef) {
        throw new BadRequestException("Stripe payment intent reference is missing");
      }

      const amountMinor = Math.round(Number(params.amount) * 100);
      const refund = await stripe.refunds.create({
        payment_intent: params.payment.providerPaymentRef,
        amount: amountMinor,
      });

      return {
        provider: this.provider,
        refundRef: refund.id,
        status: amountMinor < params.payment.amountMinor ? PaymentStatus.PartialRefund : PaymentStatus.Refunded,
        rawPayload: refund as unknown as Record<string, unknown>,
      };
    } catch (error) {
      throw this.toBadRequest(error);
    }
  }

  private get secretKey() {
    return this.configService.get<string>("payments.stripe.secretKey", "");
  }

  private get webhookSecret() {
    return this.configService.get<string>("payments.stripe.webhookSecret", "");
  }

  private getClient() {
    if (!this.secretKey) {
      throw new BadRequestException("Stripe provider is not configured");
    }

    if (!this.stripeClient) {
      this.stripeClient = new Stripe(this.secretKey, {
        apiVersion: "2026-03-25.dahlia",
      });
    }

    return this.stripeClient;
  }

  private buildDescription(clientName: string, clientPhone: string, startTime: Date) {
    return `Client ${clientName}, ${clientPhone}, appointment ${startTime.toISOString()}`;
  }

  private getPaymentIntentId(paymentIntent: string | { id?: string } | null | undefined) {
    if (!paymentIntent) {
      return null;
    }

    return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
  }

  private mapCheckoutSessionStatus(
    eventType: string,
    session: { status?: string | null; payment_status?: string | null },
  ) {
    switch (eventType) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return PaymentStatus.Paid;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        return PaymentStatus.Failed;
      default:
        return this.normalizeStripeSessionStatus(session.status, session.payment_status);
    }
  }

  private mapPaymentIntentStatus(eventType: string, status: string) {
    switch (eventType) {
      case "payment_intent.succeeded":
        return PaymentStatus.Paid;
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        return PaymentStatus.Failed;
      default:
        return status === "succeeded" ? PaymentStatus.Paid : PaymentStatus.Pending;
    }
  }

  private normalizeStripeSessionStatus(
    sessionStatus?: string | null,
    paymentStatus?: string | null,
  ) {
    if (paymentStatus === "paid") {
      return PaymentStatus.Paid;
    }

    if (sessionStatus === "expired" || paymentStatus === "unpaid" || paymentStatus === "no_payment_required") {
      return PaymentStatus.Failed;
    }

    return PaymentStatus.Pending;
  }

  private toBadRequest(error: unknown) {
    if (error instanceof BadRequestException) {
      return error;
    }

    if (error && typeof error === "object" && "message" in error) {
      return new BadRequestException(String(error.message));
    }

    return new BadRequestException("Stripe request failed");
  }

  private isMissingCheckoutSessionError(error: unknown) {
    if (!(error && typeof error === "object")) {
      return false;
    }

    const maybeError = error as { message?: unknown; code?: unknown; raw?: { code?: unknown } };
    const message = typeof maybeError.message === "string" ? maybeError.message : "";
    const code =
      typeof maybeError.code === "string"
        ? maybeError.code
        : typeof maybeError.raw?.code === "string"
          ? maybeError.raw.code
          : "";

    return code === "resource_missing" || message.includes("No such checkout.session");
  }
}
