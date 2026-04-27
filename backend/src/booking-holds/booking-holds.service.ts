import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { DataSource, EntityManager, Repository } from "typeorm";
import { BookingsService } from "../bookings/bookings.service";
import { normalizeTelegramUsername } from "../bookings/booking-rules";
import { BarbersService } from "../barbers/barbers.service";
import { ClientAuthService } from "../client-auth/client-auth.service";
import { normalizeClientPhone } from "../client-auth/client-phone";
import type { ClientSessionUser } from "../client-auth/client-jwt.strategy";
import { BookingHoldStatus } from "../common/enums/booking-hold-status.enum";
import { PaymentPolicy } from "../common/enums/payment-policy.enum";
import { PaymentEntity } from "../payments/payment.entity";
import { SlotCacheService } from "../redis/slot-cache.service";
import { ServiceEntity } from "../services/service.entity";
import { ServicesService } from "../services/services.service";
import { BookingHoldEntity } from "./booking-hold.entity";
import { CreateBookingHoldDto } from "./dto/create-booking-hold.dto";

const HOLD_TTL_MINUTES = 10;
const MAX_ACTIVE_HOLDS_PER_PHONE = 1;
const HOLD_ACTIVE_STATUSES = [
  BookingHoldStatus.Created,
  BookingHoldStatus.PaymentPending,
  BookingHoldStatus.Paid,
];

@Injectable()
export class BookingHoldsService {
  constructor(
    @InjectRepository(BookingHoldEntity)
    private readonly bookingHoldRepository: Repository<BookingHoldEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    private readonly dataSource: DataSource,
    private readonly barbersService: BarbersService,
    private readonly clientAuthService: ClientAuthService,
    private readonly servicesService: ServicesService,
    private readonly slotCacheService: SlotCacheService,
    private readonly bookingsService: BookingsService,
  ) {}

  async createHold(dto: CreateBookingHoldDto, currentClient?: ClientSessionUser | null) {
    if (dto.website?.trim()) {
      throw new BadRequestException("Spam protection triggered");
    }

    await this.bookingsService.expireStaleHolds();

    const barber = await this.barbersService.getOrFail(dto.barberId);
    if (!barber.isActive) {
      throw new BadRequestException("Selected barber is inactive");
    }

    const service = await this.servicesService.getOrFail(dto.serviceId);
    if (!service.isActive) {
      throw new BadRequestException("Selected service is inactive");
    }

    const clientPhone = normalizeClientPhone(currentClient?.phone ?? dto.clientPhone ?? "");
    const clientName = dto.clientName.trim();
    const startTime = new Date(dto.startTime);
    this.bookingsService.ensureLeadTime(startTime);

    const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);
    await this.bookingsService.ensureWithinSchedule(dto.barberId, startTime, endTime);
    await this.bookingsService.ensurePhoneBookingPolicy(clientPhone, startTime);

    const clientTelegramUsername =
      normalizeTelegramUsername(dto.clientTelegramUsername) ?? currentClient?.telegramUsername ?? null;
    const rawAccessToken = this.bookingsService.generateManageToken();
    const priceSnapshot = this.normalizeMoney(service.price);
    const depositAmount = this.calculateDepositAmount(service);
    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60_000);

    try {
      const hold = await this.dataSource.transaction("SERIALIZABLE", async (manager) => {
        await this.bookingsService.ensureSlotAvailable(dto.barberId, startTime, endTime, { manager });
        await this.ensurePhoneHoldPolicy(clientPhone, manager);

        const entity = manager.create(BookingHoldEntity, {
          clientAccountId: currentClient?.id ?? null,
          barberId: dto.barberId,
          serviceId: dto.serviceId,
          clientName,
          clientPhone,
          clientTelegramUsername,
          accessTokenHash: this.bookingsService.hashManageToken(rawAccessToken),
          startTime,
          endTime,
          priceSnapshot,
          depositAmount,
          currency: "UAH",
          notes: dto.notes?.trim() || null,
          status: BookingHoldStatus.Created,
          paymentProvider: null,
          providerCheckoutRef: null,
          idempotencyKey: randomUUID(),
          expiresAt,
          convertedBookingId: null,
        });

        return manager.save(entity);
      });

      const hydrated = await this.getHoldOrFail(hold.id);
      if (currentClient?.id) {
        await this.clientAuthService.updateTelegramUsername(currentClient.id, clientTelegramUsername);
      }
      await this.slotCacheService.invalidateWindow(hydrated.barberId, hydrated.startTime, hydrated.endTime);

      return {
        ...await this.serializeHold(hydrated),
        accessToken: rawAccessToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      const code = (error as { code?: string }).code;
      if (code === "23P01" || code === "40001" || code === "23505") {
        throw new ConflictException("This slot is already reserved");
      }

      throw error;
    }
  }

  async getPublicHold(id: string, token: string) {
    await this.bookingsService.expireStaleHolds();
    const hold = await this.authorizePublicAccess(id, token);
    return this.serializeHold(hold);
  }

  async getHoldOrFail(id: string, withAccessToken = false) {
    const qb = this.bookingHoldRepository
      .createQueryBuilder("hold")
      .leftJoinAndSelect("hold.barber", "barber")
      .leftJoinAndSelect("hold.service", "service")
      .where("hold.id = :id", { id });

    if (withAccessToken) {
      qb.addSelect("hold.accessTokenHash");
    }

    const hold = await qb.getOne();
    if (!hold) {
      throw new NotFoundException("Booking hold not found");
    }

    return hold;
  }

  async authorizePublicAccess(id: string, token: string) {
    const hold = await this.getHoldOrFail(id, true);
    if (!this.isMatchingAccessToken(hold.accessTokenHash, token)) {
      throw new UnauthorizedException("Invalid booking hold token");
    }

    return hold;
  }

  async getLatestPaymentForHold(holdId: string) {
    return this.paymentRepository.findOne({
      where: { bookingHoldId: holdId },
      order: { createdAt: "DESC" },
    });
  }

  async serializeHold(hold: BookingHoldEntity) {
    const latestPayment = await this.getLatestPaymentForHold(hold.id);

    return {
      id: hold.id,
      clientAccountId: hold.clientAccountId,
      barberId: hold.barberId,
      serviceId: hold.serviceId,
      clientName: hold.clientName,
      clientPhone: hold.clientPhone,
      clientTelegramUsername: hold.clientTelegramUsername,
      startTime: hold.startTime,
      endTime: hold.endTime,
      priceSnapshot: hold.priceSnapshot,
      depositAmount: hold.depositAmount,
      currency: hold.currency,
      notes: hold.notes,
      status: hold.status,
      paymentProvider: hold.paymentProvider,
      expiresAt: hold.expiresAt,
      convertedBookingId: hold.convertedBookingId,
      createdAt: hold.createdAt,
      updatedAt: hold.updatedAt,
      paymentRequired: Number(hold.depositAmount) > 0,
      activePayment: latestPayment
        ? {
            id: latestPayment.id,
            status: latestPayment.status,
            provider: latestPayment.provider,
            amount: latestPayment.amount,
            currency: latestPayment.currency,
            createdAt: latestPayment.createdAt,
          }
        : null,
      barber: hold.barber,
      service: hold.service,
    };
  }

  private async ensurePhoneHoldPolicy(clientPhone: string, manager: EntityManager) {
    const activeHoldCount = await manager
      .createQueryBuilder(BookingHoldEntity, "hold")
      .where("hold.client_phone = :clientPhone", { clientPhone })
      .andWhere("hold.status IN (:...activeStatuses)", {
        activeStatuses: HOLD_ACTIVE_STATUSES,
      })
      .andWhere("hold.expires_at > :now", { now: new Date() })
      .getCount();

    if (activeHoldCount >= MAX_ACTIVE_HOLDS_PER_PHONE) {
      throw new BadRequestException("One phone number can keep only one active unpaid reservation");
    }
  }

  private calculateDepositAmount(service: ServiceEntity) {
    const price = Number(service.price);
    const depositValue = service.depositValue ? Number(service.depositValue) : 0;

    switch (service.paymentPolicy) {
      case PaymentPolicy.Offline:
        return this.normalizeMoney(0);
      case PaymentPolicy.FullPrepayment:
        return this.normalizeMoney(price);
      case PaymentPolicy.DepositFixed:
        return this.normalizeMoney(Math.min(price, depositValue));
      case PaymentPolicy.DepositPercent:
      default:
        return this.normalizeMoney(Math.min(price, (price * depositValue) / 100));
    }
  }

  private normalizeMoney(value: number | string) {
    return Number(value).toFixed(2);
  }

  private isMatchingAccessToken(storedToken: string, candidate: string) {
    return this.bookingsService.isMatchingHashedToken(storedToken, candidate);
  }
}
