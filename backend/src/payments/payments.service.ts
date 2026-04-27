import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { DataSource, Repository } from "typeorm";
import { BookingHoldsService } from "../booking-holds/booking-holds.service";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BookingsService } from "../bookings/bookings.service";
import { BookingHoldStatus } from "../common/enums/booking-hold-status.enum";
import { PaymentProvider } from "../common/enums/payment-provider.enum";
import { PaymentStatus } from "../common/enums/payment-status.enum";
import { TelegramService } from "../telegram/telegram.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { PaymentEventEntity } from "./payment-event.entity";
import { PaymentProviderService } from "./payment-provider.service";
import { PaymentEntity } from "./payment.entity";
import {
  NormalizedProviderEvent,
  ProviderCheckoutSession,
  ProviderPaymentSnapshot,
} from "./providers/payment-provider.types";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly serializableRetryLimit = 3;

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(PaymentEventEntity)
    private readonly paymentEventRepository: Repository<PaymentEventEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly bookingHoldsService: BookingHoldsService,
    private readonly bookingsService: BookingsService,
    private readonly telegramService: TelegramService,
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async createCheckout(dto: CreateCheckoutDto) {
    await this.bookingsService.expireStaleHolds();
    const hold = await this.bookingHoldsService.authorizePublicAccess(dto.holdId, dto.token);

    if (hold.convertedBookingId) {
      const latestPayment = await this.bookingHoldsService.getLatestPaymentForHold(hold.id);
      return this.serializeCheckoutResponse(hold, latestPayment);
    }

    if (hold.status === BookingHoldStatus.Expired || hold.status === BookingHoldStatus.Released) {
      throw new BadRequestException("This booking hold is no longer active");
    }

    const existingPayment = await this.bookingHoldsService.getLatestPaymentForHold(hold.id);
    if (hold.status === BookingHoldStatus.Paid && existingPayment) {
      return this.serializeCheckoutResponse(hold, existingPayment);
    }

    if (Number(hold.depositAmount) <= 0) {
      const bookingId = await this.convertOfflineHold(hold.id);
      const refreshedHold = await this.bookingHoldsService.getHoldOrFail(hold.id);
      refreshedHold.convertedBookingId = bookingId;
      return this.serializeCheckoutResponse(refreshedHold, null);
    }

    const providerAdapter = this.paymentProviderService.resolve(dto.provider);
    const payment = await this.runSerializableTransaction(async (manager) => {
      const lockedHold = await manager
        .createQueryBuilder(BookingHoldEntity, "hold")
        .setLock("pessimistic_write")
        .where("hold.id = :holdId", { holdId: hold.id })
        .getOne();

      if (!lockedHold) {
        throw new NotFoundException("Booking hold not found");
      }

      if (lockedHold.convertedBookingId) {
        return manager.findOne(PaymentEntity, {
          where: { bookingHoldId: lockedHold.id },
          order: { createdAt: "DESC" },
        });
      }

      if (lockedHold.expiresAt <= new Date()) {
        lockedHold.status = BookingHoldStatus.Expired;
        await manager.save(lockedHold);
        throw new BadRequestException("This booking hold has expired");
      }

      const existingPayment = await manager.findOne(PaymentEntity, {
        where: {
          bookingHoldId: lockedHold.id,
          status: PaymentStatus.Pending,
        },
        order: { createdAt: "DESC" },
      });

      if (existingPayment) {
        if (existingPayment.provider !== providerAdapter.provider) {
          existingPayment.status = PaymentStatus.Failed;
          await manager.save(existingPayment);
        } else if (!this.canReusePendingPayment(existingPayment)) {
          existingPayment.status = PaymentStatus.Failed;
          await manager.save(existingPayment);
        } else {
          lockedHold.status = BookingHoldStatus.PaymentPending;
          lockedHold.paymentProvider = providerAdapter.provider;
          lockedHold.providerCheckoutRef = existingPayment.providerCheckoutRef;
          await manager.save(lockedHold);
          return existingPayment;
        }
      }

      const providerCheckoutRef = `${providerAdapter.provider}_chk_${randomUUID()}`;
      const created = manager.create(PaymentEntity, {
        bookingHoldId: lockedHold.id,
        bookingId: null,
        provider: providerAdapter.provider,
        kind: "deposit",
        amountMinor: this.toMinorUnits(lockedHold.depositAmount),
        amount: lockedHold.depositAmount,
        currency: lockedHold.currency,
        status: PaymentStatus.Pending,
        providerCheckoutRef,
        providerPaymentRef: null,
        idempotencyKey: randomUUID(),
        paidAt: null,
      });

      lockedHold.status = BookingHoldStatus.PaymentPending;
      lockedHold.paymentProvider = providerAdapter.provider;
      lockedHold.providerCheckoutRef = providerCheckoutRef;

      await manager.save(lockedHold);
      return manager.save(created);
    }, `createCheckout:${hold.id}`);

    const refreshedHold = await this.bookingHoldsService.getHoldOrFail(hold.id);
    if (!payment) {
      const latestPayment = await this.bookingHoldsService.getLatestPaymentForHold(hold.id);
      return this.serializeCheckoutResponse(refreshedHold, latestPayment);
    }

    const checkoutSession = await providerAdapter.createCheckoutSession({
      payment,
      hold: refreshedHold,
      returnUrls: this.buildCheckoutReturnUrls(refreshedHold.id, dto.token),
    });

    let responsePayment = payment;
    let responseHold = refreshedHold;

    if (checkoutSession.checkoutRef && checkoutSession.checkoutRef !== payment.providerCheckoutRef) {
      await this.paymentRepository.update(payment.id, {
        providerCheckoutRef: checkoutSession.checkoutRef,
        providerPaymentRef: checkoutSession.paymentRef ?? payment.providerPaymentRef,
      });
      await this.dataSource.getRepository(BookingHoldEntity).update(refreshedHold.id, {
        providerCheckoutRef: checkoutSession.checkoutRef,
      });
      responsePayment = await this.paymentRepository.findOneByOrFail({ id: payment.id });
      responseHold = await this.bookingHoldsService.getHoldOrFail(refreshedHold.id);
    } else if (checkoutSession.paymentRef && checkoutSession.paymentRef !== payment.providerPaymentRef) {
      await this.paymentRepository.update(payment.id, {
        providerPaymentRef: checkoutSession.paymentRef,
      });
      responsePayment = await this.paymentRepository.findOneByOrFail({ id: payment.id });
    }

    return this.serializeCheckoutResponse(responseHold, responsePayment, checkoutSession);
  }

  async completeMockPayment(paymentId: string, token: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: { bookingHold: true },
    });

    if (!payment || !payment.bookingHold) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.provider !== PaymentProvider.Mock) {
      throw new BadRequestException("Only mock payments can be completed manually");
    }

    await this.bookingHoldsService.authorizePublicAccess(payment.bookingHoldId, token);

    await this.handleWebhook(PaymentProvider.Mock, {
      eventId: randomUUID(),
      eventType: "payment.succeeded",
      checkoutRef: payment.providerCheckoutRef,
      paymentRef: payment.providerPaymentRef ?? `mock_pay_${payment.id}`,
      status: PaymentStatus.Paid,
    });

    const refreshedHold = await this.bookingHoldsService.getHoldOrFail(payment.bookingHoldId);
    const latestPayment = await this.bookingHoldsService.getLatestPaymentForHold(payment.bookingHoldId);
    return this.serializeCheckoutResponse(refreshedHold, latestPayment);
  }

  async handleWebhook(
    provider: string,
    payload: Record<string, unknown>,
    context?: {
      headers?: Record<string, string | string[] | undefined>;
      rawBody?: Buffer | string | null;
    },
  ) {
    const providerAdapter = this.paymentProviderService.resolve(provider, { strict: true });
    const event = await providerAdapter.parseWebhook({
      payload,
      headers: context?.headers,
      rawBody: context?.rawBody ?? null,
    });
    return this.applyProviderEvent(event);
  }

  async reconcilePendingPayments() {
    const pendingPayments = await this.paymentRepository.find({
      where: { status: PaymentStatus.Pending },
      order: { createdAt: "ASC" },
      take: 50,
    });

    let checked = 0;
    let updated = 0;

    for (const payment of pendingPayments) {
      checked += 1;

      try {
        const providerAdapter = this.paymentProviderService.resolve(payment.provider, { strict: true });
        const snapshot = await providerAdapter.fetchPaymentStatus(payment);
        if (!snapshot || snapshot.status === PaymentStatus.Pending) {
          continue;
        }

        await this.applyProviderSnapshot(snapshot);
        updated += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown reconciliation error";
        this.logger.warn(
          `Failed to reconcile payment ${payment.id} (${payment.provider}): ${message}`,
        );
      }
    }

    return {
      checked,
      updated,
    };
  }

  private async applyProviderSnapshot(snapshot: ProviderPaymentSnapshot) {
    return this.applyProviderEvent({
      provider: snapshot.provider,
      providerEventId: `reconcile:${snapshot.checkoutRef}:${snapshot.paymentRef ?? "none"}:${snapshot.status}`,
      eventType: "payment.reconciled",
      checkoutRef: snapshot.checkoutRef,
      paymentRef: snapshot.paymentRef ?? null,
      status: snapshot.status,
      rawPayload: {
        ...snapshot.rawPayload,
        source: "reconciliation",
      },
    });
  }

  private async applyProviderEvent(eventPayload: NormalizedProviderEvent) {
    const existingEvent = await this.paymentEventRepository.findOne({
      where: {
        provider: eventPayload.provider,
        providerEventId: eventPayload.providerEventId,
      },
    });

    if (existingEvent?.processingStatus === "processed") {
      return { ok: true, duplicate: true };
    }

    const paymentEvent =
      existingEvent ??
      (await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          paymentId: null,
          provider: eventPayload.provider,
          providerEventId: eventPayload.providerEventId,
          eventType: eventPayload.eventType,
          rawPayload: eventPayload.rawPayload,
          processingStatus: "received",
          processedAt: null,
        }),
      ));

    let finalizedBookingId: string | null = null;
    let releasedHoldWindow: { barberId: string; startTime: Date; endTime: Date } | null = null;

    await this.runSerializableTransaction(async (manager) => {
      const event = await manager.findOne(PaymentEventEntity, {
        where: { id: paymentEvent.id },
      });

      if (!event) {
        throw new NotFoundException("Payment event not found");
      }

      const payment = await manager
        .createQueryBuilder(PaymentEntity, "payment")
        .setLock("pessimistic_write")
        .where("payment.provider = :provider", {
          provider: eventPayload.provider,
        })
        .andWhere(
          "(payment.provider_checkout_ref = :checkoutRef OR payment.provider_payment_ref = :paymentRef)",
          {
            checkoutRef: eventPayload.checkoutRef,
            paymentRef: eventPayload.paymentRef ?? "__no_payment_ref__",
          },
        )
        .getOne();

      if (!payment) {
        event.processingStatus = "ignored";
        event.processedAt = new Date();
        await manager.save(event);
        return;
      }

      const hold = await manager
        .createQueryBuilder(BookingHoldEntity, "hold")
        .addSelect("hold.accessTokenHash")
        .setLock("pessimistic_write")
        .where("hold.id = :holdId", { holdId: payment.bookingHoldId })
        .getOne();

      if (!hold) {
        event.processingStatus = "ignored";
        event.processedAt = new Date();
        await manager.save(event);
        return;
      }

      event.paymentId = payment.id;
      event.rawPayload = eventPayload.rawPayload;
      event.eventType = eventPayload.eventType;
      payment.providerPaymentRef = eventPayload.paymentRef ?? payment.providerPaymentRef ?? null;

      switch (eventPayload.status) {
        case PaymentStatus.Paid: {
          payment.status = PaymentStatus.Paid;
          payment.paidAt = payment.paidAt ?? new Date();

          if (hold.convertedBookingId) {
            payment.bookingId = hold.convertedBookingId;
            hold.status = BookingHoldStatus.Converted;
          } else if (hold.expiresAt <= new Date()) {
            hold.status = BookingHoldStatus.Expired;
            releasedHoldWindow = {
              barberId: hold.barberId,
              startTime: hold.startTime,
              endTime: hold.endTime,
            };
          } else {
            hold.status = BookingHoldStatus.Paid;
            const booking = await this.bookingsService.createBookingFromHold(manager, hold);
            finalizedBookingId = booking.id;
            hold.convertedBookingId = booking.id;
            hold.status = BookingHoldStatus.Converted;
            payment.bookingId = booking.id;
          }
          break;
        }
        case PaymentStatus.Failed: {
          payment.status = PaymentStatus.Failed;
          if (hold.status !== BookingHoldStatus.Converted) {
            hold.status = BookingHoldStatus.Failed;
            releasedHoldWindow = {
              barberId: hold.barberId,
              startTime: hold.startTime,
              endTime: hold.endTime,
            };
          }
          break;
        }
        default: {
          payment.status = eventPayload.status;
          break;
        }
      }

      event.processingStatus = "processed";
      event.processedAt = new Date();

      await manager.save(payment);
      await manager.save(hold);
      await manager.save(event);
    }, `applyProviderEvent:${eventPayload.providerEventId}`);

    if (finalizedBookingId) {
      const booking = await this.bookingsService.getBookingForAlerts(finalizedBookingId);
      await this.telegramService.sendNewBookingAlert(booking);
      await this.telegramService.sendClientBookingAlert(booking);
    }

    await this.releaseAvailabilityWindow(releasedHoldWindow);

    return {
      ok: true,
      duplicate: false,
      bookingId: finalizedBookingId,
    };
  }

  private async convertOfflineHold(holdId: string) {
    let bookingId: string | null = null;

    await this.runSerializableTransaction(async (manager) => {
      const hold = await manager
        .createQueryBuilder(BookingHoldEntity, "hold")
        .addSelect("hold.accessTokenHash")
        .setLock("pessimistic_write")
        .where("hold.id = :holdId", { holdId })
        .getOne();

      if (!hold) {
        throw new NotFoundException("Booking hold not found");
      }

      if (hold.convertedBookingId) {
        bookingId = hold.convertedBookingId;
        return;
      }

      const booking = await this.bookingsService.createBookingFromHold(manager, hold);
      hold.convertedBookingId = booking.id;
      hold.status = BookingHoldStatus.Converted;
      await manager.save(hold);
      bookingId = booking.id;
    }, `convertOfflineHold:${holdId}`);

    if (!bookingId) {
      throw new NotFoundException("Converted booking not found");
    }

    const booking = await this.bookingsService.getBookingForAlerts(bookingId);
    await this.telegramService.sendNewBookingAlert(booking);
    await this.telegramService.sendClientBookingAlert(booking);
    return bookingId;
  }

  private serializeCheckoutResponse(
    hold: BookingHoldEntity,
    payment: PaymentEntity | null,
    checkoutSession?: ProviderCheckoutSession | null,
  ) {
    return {
      holdId: hold.id,
      bookingId: hold.convertedBookingId,
      holdStatus: hold.status,
      expiresAt: hold.expiresAt,
      paymentRequired: Number(hold.depositAmount) > 0,
      provider: checkoutSession?.provider ?? payment?.provider ?? hold.paymentProvider ?? null,
      redirect: checkoutSession?.redirect ?? null,
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            provider: payment.provider,
            amount: payment.amount,
            currency: payment.currency,
            createdAt: payment.createdAt,
          }
        : null,
    };
  }

  private buildCheckoutReturnUrls(holdId: string, token: string) {
    const frontendUrl = this.configService.get<string>("app.frontendUrl", "http://localhost:3000");
    const normalizedBase = frontendUrl.replace(/\/+$/, "");
    const buildUrl = (checkout: "success" | "cancel") => {
      const url = new URL(`${normalizedBase}/booking/hold/${holdId}`);
      url.searchParams.set("token", token);
      url.searchParams.set("checkout", checkout);
      return url.toString();
    };

    return {
      successUrl: buildUrl("success"),
      cancelUrl: buildUrl("cancel"),
    };
  }

  private toMinorUnits(value: string) {
    return Math.round(Number(value) * 100);
  }

  private canReusePendingPayment(payment: PaymentEntity) {
    if (payment.provider === PaymentProvider.Stripe) {
      return payment.providerCheckoutRef.startsWith("cs_");
    }

    return true;
  }

  private async runSerializableTransaction<T>(
    work: (manager: import("typeorm").EntityManager) => Promise<T>,
    label: string,
  ): Promise<T> {
    for (let attempt = 1; attempt <= this.serializableRetryLimit; attempt += 1) {
      try {
        return await this.dataSource.transaction("SERIALIZABLE", work);
      } catch (error) {
        if (!this.isSerializationConflict(error) || attempt === this.serializableRetryLimit) {
          throw error;
        }

        this.logger.warn(
          `Retrying serializable transaction ${label} after conflict (attempt ${attempt + 1}/${this.serializableRetryLimit}).`,
        );
        await this.delay(50 * attempt);
      }
    }

    throw new BadRequestException("Transaction retry limit reached");
  }

  private isSerializationConflict(error: unknown) {
    return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "40001");
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async releaseAvailabilityWindow(
    availabilityWindow: { barberId: string; startTime: Date; endTime: Date } | null,
  ) {
    if (!availabilityWindow) {
      return;
    }

    await this.bookingsService.invalidateAvailabilityForWindow(
      availabilityWindow.barberId,
      availabilityWindow.startTime,
      availabilityWindow.endTime,
    );
  }
}
