import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { DataSource, EntityManager, Repository } from "typeorm";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BarbersService } from "../barbers/barbers.service";
import { ClientAuthService } from "../client-auth/client-auth.service";
import { normalizeClientPhone } from "../client-auth/client-phone";
import type { ClientSessionUser } from "../client-auth/client-jwt.strategy";
import { BookingHoldStatus } from "../common/enums/booking-hold-status.enum";
import { BookingPaymentStatus } from "../common/enums/booking-payment-status.enum";
import { BookingStatus } from "../common/enums/booking-status.enum";
import { BookingSource } from "../common/enums/booking-source.enum";
import { PaymentStatus } from "../common/enums/payment-status.enum";
import { RefundStatus } from "../common/enums/refund-status.enum";
import { PaymentProviderService } from "../payments/payment-provider.service";
import { PaymentEntity } from "../payments/payment.entity";
import { RefundEntity } from "../payments/refund.entity";
import { SlotCacheService } from "../redis/slot-cache.service";
import { ScheduleExceptionEntity } from "../schedule/schedule-exception.entity";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { ServicesService } from "../services/services.service";
import { TelegramService } from "../telegram/telegram.service";
import { BookingEntity } from "./booking.entity";
import {
  combineDateAndTime,
  formatDatePart,
  formatDateTime,
  isPositiveRange,
  normalizeTelegramUsername,
} from "./booking-rules";
import { CancelBookingDto } from "./dto/cancel-booking.dto";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { CreateAdminBookingDto } from "./dto/create-admin-booking.dto";
import { GetSlotsQueryDto } from "./dto/get-slots-query.dto";
import { ListAdminBookingsQueryDto } from "./dto/list-admin-bookings-query.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

const SLOT_STEP_MINUTES = 30;
const MIN_BOOKING_LEAD_MINUTES = 30;
const MAX_ACTIVE_FUTURE_BOOKINGS_PER_PHONE = 2;
const MAX_ACTIVE_BOOKINGS_PER_DAY_PER_PHONE = 1;
const FREE_CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000;
const ACTIVE_HOLD_STATUSES = [
  BookingHoldStatus.Created,
  BookingHoldStatus.PaymentPending,
  BookingHoldStatus.Paid,
];

type TimeRangeLike = {
  startTime: Date;
  endTime: Date;
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(BookingHoldEntity)
    private readonly bookingHoldRepository: Repository<BookingHoldEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepository: Repository<RefundEntity>,
    @InjectRepository(WorkScheduleEntity)
    private readonly scheduleRepository: Repository<WorkScheduleEntity>,
    @InjectRepository(ScheduleExceptionEntity)
    private readonly scheduleExceptionRepository: Repository<ScheduleExceptionEntity>,
    private readonly dataSource: DataSource,
    private readonly barbersService: BarbersService,
    private readonly clientAuthService: ClientAuthService,
    private readonly servicesService: ServicesService,
    private readonly slotCacheService: SlotCacheService,
    private readonly telegramService: TelegramService,
    @Inject(PaymentProviderService)
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async getPublicBooking(id: string, token: string) {
    const booking = await this.authorizePublicAccess(id, token);
    return this.serializeBooking(booking);
  }

  async listAdminBookings(query: ListAdminBookingsQueryDto) {
    const qb = this.bookingRepository.createQueryBuilder("booking");
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    qb.leftJoinAndSelect("booking.barber", "barber");
    qb.leftJoinAndSelect("booking.service", "service");
    qb.orderBy("booking.start_time", "ASC");

    if (query.date) {
      const dayStart = `${query.date}T00:00:00`;
      const dayEnd = `${query.date}T23:59:59`;
      qb.andWhere("booking.start_time BETWEEN :dayStart AND :dayEnd", { dayStart, dayEnd });
    }

    if (query.barberId) {
      qb.andWhere("booking.barber_id = :barberId", { barberId: query.barberId });
    }

    if (query.status) {
      qb.andWhere("booking.status = :status", { status: query.status });
    }

    if (query.search) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(booking.client_name) LIKE :search OR LOWER(booking.client_phone) LIKE :search OR LOWER(COALESCE(booking.notes, '')) LIKE :search)`,
        { search },
      );
    }

    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getAvailableSlots(barberId: string, query: GetSlotsQueryDto) {
    await this.barbersService.getOrFail(barberId);
    const service = await this.servicesService.getOrFail(query.serviceId);
    const cachedSlots = await this.slotCacheService.get(barberId, query.date, query.serviceId);
    if (cachedSlots) {
      return cachedSlots;
    }

    const workWindow = await this.getWorkWindow(barberId, query.date);

    if (!workWindow) {
      const emptyPayload = {
        date: query.date,
        barberId,
        serviceDuration: service.durationMin,
        slots: [],
      };
      await this.slotCacheService.set(barberId, query.date, query.serviceId, emptyPayload);
      return emptyPayload;
    }

    const { dayStart, dayEnd } = this.getDateBounds(query.date);
    const [busyBookings, busyHolds] = await Promise.all([
      this.bookingRepository
        .createQueryBuilder("booking")
        .where("booking.barber_id = :barberId", { barberId })
        .andWhere("booking.status <> :canceled", { canceled: BookingStatus.Canceled })
        .andWhere("booking.start_time < :dayEnd", { dayEnd })
        .andWhere("booking.end_time > :dayStart", { dayStart })
        .getMany(),
      this.bookingHoldRepository
        .createQueryBuilder("hold")
        .where("hold.barber_id = :barberId", { barberId })
        .andWhere("hold.status IN (:...activeStatuses)", {
          activeStatuses: ACTIVE_HOLD_STATUSES,
        })
        .andWhere("hold.expires_at > :now", { now: new Date() })
        .andWhere("hold.start_time < :dayEnd", { dayEnd })
        .andWhere("hold.end_time > :dayStart", { dayStart })
        .getMany(),
    ]);

    const slots = this.generateSlots({
      date: query.date,
      startTime: workWindow.startTime,
      endTime: workWindow.endTime,
      durationMin: service.durationMin,
      busyRanges: [...busyBookings, ...busyHolds],
    });

    const payload = {
      date: query.date,
      barberId,
      serviceDuration: service.durationMin,
      slots,
    };
    await this.slotCacheService.set(barberId, query.date, query.serviceId, payload);
    return payload;
  }

  async createBooking(
    dto: CreateBookingDto,
    currentClient?: ClientSessionUser | null,
    options?: {
      defaultStatus?: BookingStatus;
      bypassPhoneLimit?: boolean;
      bypassLeadTime?: boolean;
      source?: BookingSource;
      paymentStatus?: BookingPaymentStatus;
      priceSnapshot?: string;
      depositAmount?: string;
      currency?: string;
      manageTokenHash?: string;
      bookingHoldId?: string | null;
      clientAccountId?: string | null;
    },
  ) {
    if (dto.website?.trim()) {
      throw new BadRequestException("Spam protection triggered");
    }

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
    if (!options?.bypassLeadTime) {
      this.ensureLeadTime(startTime);
    }
    const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);
    await this.ensureWithinSchedule(dto.barberId, startTime, endTime);
    if (!options?.bypassPhoneLimit) {
      await this.ensurePhoneBookingPolicy(clientPhone, startTime);
    }

    const clientTelegramUsername =
      normalizeTelegramUsername(dto.clientTelegramUsername) ?? currentClient?.telegramUsername ?? null;
    const rawManagementToken = options?.manageTokenHash ? null : this.generateManageToken();
    const defaultStatus = options?.defaultStatus ?? BookingStatus.Pending;
    const priceSnapshot = options?.priceSnapshot ?? service.price;
    const depositAmount = options?.depositAmount ?? "0.00";

    try {
      const booking = await this.dataSource.transaction("SERIALIZABLE", async (manager) => {
        await this.ensureSlotAvailable(dto.barberId, startTime, endTime, { manager });

        const entity = manager.create(BookingEntity, {
          bookingHoldId: options?.bookingHoldId ?? null,
          clientAccountId: options?.clientAccountId ?? currentClient?.id ?? null,
          barberId: dto.barberId,
          serviceId: dto.serviceId,
          source: options?.source ?? BookingSource.Site,
          clientName,
          clientPhone,
          clientTelegramUsername,
          clientManageToken:
            options?.manageTokenHash ?? this.hashManageToken(rawManagementToken ?? this.generateManageToken()),
          startTime,
          endTime,
          priceSnapshot,
          depositAmount,
          currency: options?.currency ?? "UAH",
          paymentStatus: options?.paymentStatus ?? BookingPaymentStatus.Unpaid,
          notes: dto.notes?.trim() || null,
          status: defaultStatus,
          cancellationReason: null,
          canceledAt: null,
          completedAt: null,
          reminder24hSentAt: null,
          reminder2hSentAt: null,
        });

        return manager.save(entity);
      });

      const hydrated = await this.getBookingOrFail(booking.id);
      if (currentClient?.id) {
        await this.clientAuthService.updateTelegramUsername(currentClient.id, clientTelegramUsername);
      }
      await this.invalidateAvailabilityForWindow(hydrated.barberId, hydrated.startTime, hydrated.endTime);
      await this.telegramService.sendNewBookingAlert(hydrated);
      await this.telegramService.sendClientBookingAlert(hydrated);
      return {
        ...this.serializeBooking(hydrated),
        managementToken: rawManagementToken ?? undefined,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      const code = (error as { code?: string }).code;
      if (code === "23P01" || code === "40001" || code === "23505") {
        throw new ConflictException("This slot is already booked");
      }

      throw error;
    }
  }

  async createAdminBooking(dto: CreateAdminBookingDto) {
    return this.createBooking(dto, null, {
      defaultStatus:
        dto.status === BookingStatus.Canceled || dto.status === BookingStatus.Completed
          ? BookingStatus.Confirmed
          : dto.status ?? BookingStatus.Confirmed,
      bypassPhoneLimit: true,
      bypassLeadTime: true,
      source: BookingSource.Admin,
      paymentStatus: BookingPaymentStatus.Unpaid,
    });
  }

  async cancelBooking(id: string, dto: CancelBookingDto) {
    const booking = await this.authorizePublicAccess(id, dto.token);
    if (booking.status === BookingStatus.Completed) {
      throw new BadRequestException("Completed bookings cannot be canceled");
    }

    if (booking.status === BookingStatus.Canceled) {
      return this.serializeBooking(booking);
    }

    booking.status = BookingStatus.Canceled;
    booking.cancellationReason = dto.reason?.trim() || null;
    booking.canceledAt = new Date();
    const saved = await this.bookingRepository.save(booking);

    const refundOutcome = await this.processCancellationRefund(saved, dto.reason);
    if (refundOutcome) {
      saved.paymentStatus = refundOutcome.bookingPaymentStatus;
      await this.bookingRepository.save(saved);
    }

    await this.telegramService.sendStatusUpdateAlert(saved);
    await this.telegramService.sendClientStatusUpdate(saved);
    await this.invalidateAvailabilityForWindow(saved.barberId, saved.startTime, saved.endTime);
    return this.serializeBooking(saved);
  }

  async rescheduleBooking(id: string, dto: RescheduleBookingDto) {
    const existing = await this.authorizePublicAccess(id, dto.token);
    const previousStartTime = new Date(existing.startTime);
    const previousEndTime = new Date(existing.endTime);
    if (existing.status === BookingStatus.Canceled || existing.status === BookingStatus.Completed) {
      throw new BadRequestException("This booking can no longer be rescheduled");
    }

    if (
      existing.paymentStatus === BookingPaymentStatus.Refunded ||
      existing.paymentStatus === BookingPaymentStatus.PartialRefund
    ) {
      throw new BadRequestException("This booking can no longer be rescheduled after a refund");
    }

    const barber = await this.barbersService.getOrFail(existing.barberId);
    const service = await this.servicesService.getOrFail(existing.serviceId);
    if (!barber.isActive || !service.isActive) {
      throw new BadRequestException("This booking cannot be rescheduled right now");
    }

    const startTime = new Date(dto.startTime);
    this.ensureLeadTime(startTime);
    const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);
    await this.ensureWithinSchedule(existing.barberId, startTime, endTime);
    await this.ensurePhoneBookingPolicy(existing.clientPhone, startTime, existing.id);

    try {
      const booking = await this.dataSource.transaction("SERIALIZABLE", async (manager) => {
        await this.ensureSlotAvailable(existing.barberId, startTime, endTime, {
          manager,
          excludeBookingId: existing.id,
        });

        existing.startTime = startTime;
        existing.endTime = endTime;
        existing.cancellationReason = null;
        existing.canceledAt = null;
        existing.reminder24hSentAt = null;
        existing.reminder2hSentAt = null;
        return manager.save(existing);
      });

      const hydrated = await this.getBookingOrFail(booking.id);
      await Promise.all([
        this.invalidateAvailabilityForWindow(hydrated.barberId, previousStartTime, previousEndTime),
        this.invalidateAvailabilityForWindow(hydrated.barberId, hydrated.startTime, hydrated.endTime),
      ]);
      await this.telegramService.sendRescheduleAlert(hydrated);
      await this.telegramService.sendClientRescheduleAlert(hydrated);
      return this.serializeBooking(hydrated);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      const code = (error as { code?: string }).code;
      if (code === "23P01" || code === "40001" || code === "23505") {
        throw new ConflictException("This slot is already booked");
      }

      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.getBookingOrFail(id);
    booking.status = dto.status;
    booking.canceledAt = dto.status === BookingStatus.Canceled ? new Date() : null;
    booking.completedAt = dto.status === BookingStatus.Completed ? new Date() : null;
    if (dto.status !== BookingStatus.Canceled) {
      booking.cancellationReason = null;
    }
    const saved = await this.bookingRepository.save(booking);
    await this.invalidateAvailabilityForWindow(saved.barberId, saved.startTime, saved.endTime);
    await this.telegramService.sendStatusUpdateAlert(saved);
    await this.telegramService.sendClientStatusUpdate(saved);
    return saved;
  }

  async createBookingFromHold(manager: EntityManager, hold: BookingHoldEntity) {
    if (hold.convertedBookingId) {
      const existing = await manager.findOne(BookingEntity, {
        where: { id: hold.convertedBookingId },
        relations: { barber: true, service: true },
      });

      if (!existing) {
        throw new NotFoundException("Converted booking not found");
      }

      return existing;
    }

    if (!hold.accessTokenHash) {
      throw new BadRequestException("Booking hold access token hash is missing");
    }

    const entity = manager.create(BookingEntity, {
      bookingHoldId: hold.id,
      clientAccountId: hold.clientAccountId,
      barberId: hold.barberId,
      serviceId: hold.serviceId,
      source: BookingSource.Site,
      clientName: hold.clientName,
      clientPhone: hold.clientPhone,
      clientTelegramUsername: hold.clientTelegramUsername,
      clientManageToken: hold.accessTokenHash,
      startTime: hold.startTime,
      endTime: hold.endTime,
      priceSnapshot: hold.priceSnapshot,
      depositAmount: hold.depositAmount,
      currency: hold.currency,
      paymentStatus: this.resolvePaymentStatusFromAmounts(hold.depositAmount, hold.priceSnapshot),
      status: BookingStatus.Confirmed,
      notes: hold.notes,
      cancellationReason: null,
      canceledAt: null,
      completedAt: null,
      reminder24hSentAt: null,
      reminder2hSentAt: null,
    });

    return manager.save(entity);
  }

  async getBookingForAlerts(id: string) {
    return this.getBookingOrFail(id);
  }

  async ensureWithinSchedule(barberId: string, startTime: Date, endTime: Date) {
    const dateString = formatDatePart(startTime);
    const workWindow = await this.getWorkWindow(barberId, dateString);

    if (!workWindow) {
      throw new BadRequestException("Barber does not work on the selected date");
    }

    const scheduleStart = combineDateAndTime(dateString, workWindow.startTime);
    const scheduleEnd = combineDateAndTime(dateString, workWindow.endTime);
    if (startTime < scheduleStart || endTime > scheduleEnd) {
      throw new BadRequestException("Booking is outside working hours");
    }
  }

  ensureLeadTime(startTime: Date) {
    const threshold = Date.now() + MIN_BOOKING_LEAD_MINUTES * 60_000;
    if (startTime.getTime() < threshold) {
      throw new BadRequestException("This slot is too close to the current time");
    }
  }

  async ensurePhoneBookingPolicy(
    clientPhone: string,
    startTime: Date,
    excludeBookingId?: string,
  ) {
    const qb = this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.client_phone = :clientPhone", { clientPhone })
      .andWhere("booking.status IN (:...activeStatuses)", {
        activeStatuses: [BookingStatus.Pending, BookingStatus.Confirmed],
      })
      .andWhere("booking.end_time > :now", { now: new Date() });

    if (excludeBookingId) {
      qb.andWhere("booking.id <> :excludeBookingId", { excludeBookingId });
    }

    const activeBookings = await qb.getMany();
    if (activeBookings.length >= MAX_ACTIVE_FUTURE_BOOKINGS_PER_PHONE) {
      throw new BadRequestException(
        "One phone number can hold up to 2 active future bookings at the same time",
      );
    }

    const targetDate = formatDatePart(startTime);
    const sameDayBookings = activeBookings.filter(
      (booking) => formatDatePart(booking.startTime) === targetDate,
    );

    if (sameDayBookings.length >= MAX_ACTIVE_BOOKINGS_PER_DAY_PER_PHONE) {
      throw new BadRequestException(
        "One phone number can hold only one online booking for the same day",
      );
    }
  }

  async expireStaleHolds(manager?: EntityManager) {
    const executor = manager ?? this.dataSource.manager;
    const staleHolds = await executor
      .createQueryBuilder(BookingHoldEntity, "hold")
      .select(["hold.id", "hold.barberId", "hold.startTime", "hold.endTime"])
      .where("hold.status IN (:...activeStatuses)", {
        activeStatuses: ACTIVE_HOLD_STATUSES,
      })
      .andWhere("hold.expires_at <= :now", { now: new Date() })
      .andWhere("hold.converted_booking_id IS NULL")
      .getMany();

    if (staleHolds.length === 0) {
      return 0;
    }

    const result = await executor
      .createQueryBuilder()
      .update(BookingHoldEntity)
      .set({
        status: BookingHoldStatus.Expired,
      })
      .where("status IN (:...activeStatuses)", {
        activeStatuses: ACTIVE_HOLD_STATUSES,
      })
      .andWhere("expires_at <= :now", { now: new Date() })
      .andWhere("converted_booking_id IS NULL")
      .execute();

    const invalidations = this.collectAvailabilityInvalidations(staleHolds);
    await Promise.all(
      invalidations.map(({ barberId, date }) => this.slotCacheService.invalidateDate(barberId, date)),
    );

    return result.affected ?? 0;
  }

  async invalidateAvailabilityForWindow(barberId: string, startTime: Date, endTime?: Date | null) {
    await this.slotCacheService.invalidateWindow(barberId, startTime, endTime);
  }

  async ensureSlotAvailable(
    barberId: string,
    startTime: Date,
    endTime: Date,
    options?: {
      manager?: EntityManager;
      excludeBookingId?: string;
      excludeHoldId?: string;
    },
  ) {
    const manager = options?.manager ?? this.dataSource.manager;
    const bookingConflictCount = await this.buildBookingConflictQuery(manager, barberId, startTime, endTime, {
      excludeBookingId: options?.excludeBookingId,
    }).getCount();

    if (bookingConflictCount > 0) {
      throw new ConflictException("This slot is already booked");
    }

    const holdConflictCount = await this.buildHoldConflictQuery(manager, barberId, startTime, endTime, {
      excludeHoldId: options?.excludeHoldId,
    }).getCount();

    if (holdConflictCount > 0) {
      throw new ConflictException("This slot is currently reserved for payment");
    }
  }

  hashManageToken(token: string) {
    return createHash("sha256").update(token.trim().toLowerCase()).digest("hex");
  }

  generateManageToken() {
    return randomBytes(24).toString("hex");
  }

  isMatchingHashedToken(storedToken: string, candidate: string) {
    return this.isMatchingManageToken(storedToken, candidate);
  }

  private async getBookingOrFail(id: string, withManageToken = false) {
    const qb = this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.barber", "barber")
      .leftJoinAndSelect("booking.service", "service")
      .where("booking.id = :id", { id });

    if (withManageToken) {
      qb.addSelect("booking.clientManageToken");
    }

    const booking = await qb.getOne();
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    return booking;
  }

  private async authorizePublicAccess(id: string, token: string) {
    const booking = await this.getBookingOrFail(id, true);
    if (!this.isMatchingManageToken(booking.clientManageToken, token)) {
      throw new UnauthorizedException("Invalid booking token");
    }

    return booking;
  }

  private isMatchingManageToken(storedToken: string, candidate: string) {
    const normalizedCandidate = candidate.trim().toLowerCase();

    if (storedToken.length === 64) {
      return this.secureHexEquals(storedToken, this.hashManageToken(normalizedCandidate));
    }

    return this.secureTextEquals(storedToken, normalizedCandidate);
  }

  private secureHexEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private secureTextEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left, "utf8");
    const rightBuffer = Buffer.from(right, "utf8");

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private getDateBounds(date: string) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    return { dayStart, dayEnd };
  }

  private async getWorkWindow(barberId: string, date: string) {
    const exception = await this.scheduleExceptionRepository.findOne({
      where: { barberId, date },
    });

    if (exception) {
      if (exception.isDayOff || !isPositiveRange(exception.startTime, exception.endTime)) {
        return null;
      }

      return {
        startTime: exception.startTime as string,
        endTime: exception.endTime as string,
      };
    }

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    const schedule = await this.scheduleRepository.findOne({
      where: { barberId, dayOfWeek },
    });

    if (!schedule || schedule.isDayOff || !isPositiveRange(schedule.startTime, schedule.endTime)) {
      return null;
    }

    return {
      startTime: schedule.startTime as string,
      endTime: schedule.endTime as string,
    };
  }

  private generateSlots(params: {
    date: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    busyRanges: TimeRangeLike[];
  }) {
    const scheduleStart = combineDateAndTime(params.date, params.startTime);
    const scheduleEnd = combineDateAndTime(params.date, params.endTime);
    const nowThreshold = new Date(Date.now() + MIN_BOOKING_LEAD_MINUTES * 60_000);

    const slots: string[] = [];
    let cursor = new Date(scheduleStart);

    while (cursor.getTime() + params.durationMin * 60_000 <= scheduleEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + params.durationMin * 60_000);
      const hasConflict = params.busyRanges.some(
        (booking) => booking.startTime < slotEnd && booking.endTime > slotStart,
      );

      if (!hasConflict && slotStart >= nowThreshold) {
        slots.push(formatDateTime(slotStart));
      }

      cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60_000);
    }

    return slots;
  }

  private serializeBooking(booking: BookingEntity) {
    return {
      id: booking.id,
      bookingHoldId: booking.bookingHoldId,
      clientAccountId: booking.clientAccountId,
      barberId: booking.barberId,
      serviceId: booking.serviceId,
      source: booking.source,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      clientTelegramUsername: booking.clientTelegramUsername,
      startTime: booking.startTime,
      endTime: booking.endTime,
      priceSnapshot: booking.priceSnapshot,
      depositAmount: booking.depositAmount,
      currency: booking.currency,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      notes: booking.notes,
      cancellationReason: booking.cancellationReason,
      canceledAt: booking.canceledAt,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      barber: booking.barber,
      service: booking.service,
    };
  }

  private resolvePaymentStatusFromAmounts(depositAmount: string, priceSnapshot: string) {
    const deposit = Number(depositAmount);
    const price = Number(priceSnapshot);

    if (deposit <= 0) {
      return BookingPaymentStatus.Unpaid;
    }

    if (deposit >= price) {
      return BookingPaymentStatus.Paid;
    }

    return BookingPaymentStatus.PartiallyPaid;
  }

  private async processCancellationRefund(booking: BookingEntity, reason?: string) {
    const payment = await this.getLatestRefundablePayment(booking.id);
    if (!payment) {
      return null;
    }

    const refundAmount = this.calculateRefundAmountForCancellation(booking, payment);
    if (Number(refundAmount) <= 0) {
      return null;
    }

    const refund = await this.refundRepository.save(
      this.refundRepository.create({
        paymentId: payment.id,
        bookingId: booking.id,
        provider: payment.provider,
        amountMinor: this.toMinorUnits(refundAmount),
        amount: refundAmount,
        currency: payment.currency,
        status: RefundStatus.Pending,
        providerRefundRef: null,
        reason: reason?.trim() || "booking canceled",
        rawPayload: null,
        processedAt: null,
      }),
    );

    try {
      const providerAdapter = this.paymentProviderService.resolve(payment.provider, { strict: true });
      const refundResult = await providerAdapter.refundPayment({
        payment,
        amount: refundAmount,
      });

      refund.status =
        refundResult.status === PaymentStatus.Refunded ||
        refundResult.status === PaymentStatus.PartialRefund
          ? RefundStatus.Processed
          : RefundStatus.Failed;
      refund.providerRefundRef = refundResult.refundRef ?? null;
      refund.rawPayload = refundResult.rawPayload;
      refund.processedAt = new Date();
      await this.refundRepository.save(refund);

      if (refund.status !== RefundStatus.Processed) {
        return null;
      }

      payment.status = refundResult.status;
      await this.paymentRepository.save(payment);

      return {
        bookingPaymentStatus:
          refundResult.status === PaymentStatus.PartialRefund
            ? BookingPaymentStatus.PartialRefund
            : BookingPaymentStatus.Refunded,
      };
    } catch (error) {
      refund.status = RefundStatus.Failed;
      refund.rawPayload = {
        error: error instanceof Error ? error.message : "Unknown refund error",
      };
      refund.processedAt = new Date();
      await this.refundRepository.save(refund);
      return null;
    }
  }

  private async getLatestRefundablePayment(bookingId: string) {
    return this.paymentRepository.findOne({
      where: {
        bookingId,
        status: PaymentStatus.Paid,
      },
      order: {
        paidAt: "DESC",
        createdAt: "DESC",
      },
    });
  }

  private calculateRefundAmountForCancellation(booking: BookingEntity, payment: PaymentEntity) {
    const startsInMs = booking.startTime.getTime() - Date.now();
    if (startsInMs < FREE_CANCELLATION_WINDOW_MS) {
      return "0.00";
    }

    return this.normalizeMoney(payment.amount);
  }

  private normalizeMoney(value: string | number) {
    return Number(value).toFixed(2);
  }

  private toMinorUnits(value: string) {
    return Math.round(Number(value) * 100);
  }

  private collectAvailabilityInvalidations(
    entries: Array<{ barberId: string; startTime: Date; endTime?: Date | null }>,
  ) {
    const keys = new Set<string>();

    entries.forEach((entry) => {
      keys.add(`${entry.barberId}:${formatDatePart(entry.startTime)}`);
      if (entry.endTime) {
        keys.add(`${entry.barberId}:${formatDatePart(entry.endTime)}`);
      }
    });

    return [...keys].map((value) => {
      const [barberId, date] = value.split(":");
      return { barberId, date };
    });
  }

  private buildBookingConflictQuery(
    manager: EntityManager,
    barberId: string,
    startTime: Date,
    endTime: Date,
    options?: {
      excludeBookingId?: string;
    },
  ) {
    const qb = manager
      .createQueryBuilder(BookingEntity, "booking")
      .where("booking.barber_id = :barberId", { barberId })
      .andWhere("booking.status <> :canceled", { canceled: BookingStatus.Canceled })
      .andWhere("booking.start_time < :endTime", { endTime })
      .andWhere("booking.end_time > :startTime", { startTime });

    if (options?.excludeBookingId) {
      qb.andWhere("booking.id <> :excludeBookingId", {
        excludeBookingId: options.excludeBookingId,
      });
    }

    return qb;
  }

  private buildHoldConflictQuery(
    manager: EntityManager,
    barberId: string,
    startTime: Date,
    endTime: Date,
    options?: {
      excludeHoldId?: string;
    },
  ) {
    const qb = manager
      .createQueryBuilder(BookingHoldEntity, "hold")
      .where("hold.barber_id = :barberId", { barberId })
      .andWhere("hold.status IN (:...activeStatuses)", {
        activeStatuses: ACTIVE_HOLD_STATUSES,
      })
      .andWhere("hold.expires_at > :now", { now: new Date() })
      .andWhere("hold.start_time < :endTime", { endTime })
      .andWhere("hold.end_time > :startTime", { startTime });

    if (options?.excludeHoldId) {
      qb.andWhere("hold.id <> :excludeHoldId", { excludeHoldId: options.excludeHoldId });
    }

    return qb;
  }
}
