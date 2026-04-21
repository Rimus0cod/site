import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { DataSource, Not, Repository } from "typeorm";
import { BarbersService } from "../barbers/barbers.service";
import { BookingStatus } from "../common/enums/booking-status.enum";
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

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(WorkScheduleEntity)
    private readonly scheduleRepository: Repository<WorkScheduleEntity>,
    @InjectRepository(ScheduleExceptionEntity)
    private readonly scheduleExceptionRepository: Repository<ScheduleExceptionEntity>,
    private readonly dataSource: DataSource,
    private readonly barbersService: BarbersService,
    private readonly servicesService: ServicesService,
    private readonly telegramService: TelegramService,
  ) {}

  async getPublicBooking(id: string, token: string) {
    const booking = await this.authorizePublicAccess(id, token);
    return this.serializeBooking(booking);
  }

  async listAdminBookings(query: ListAdminBookingsQueryDto) {
    const qb = this.bookingRepository.createQueryBuilder("booking");
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

    return qb.getMany();
  }

  async getAvailableSlots(barberId: string, query: GetSlotsQueryDto) {
    await this.barbersService.getOrFail(barberId);
    const service = await this.servicesService.getOrFail(query.serviceId);
    const workWindow = await this.getWorkWindow(barberId, query.date);

    if (!workWindow) {
      return {
        date: query.date,
        barberId,
        serviceDuration: service.durationMin,
        slots: [],
      };
    }

    const { dayStart, dayEnd } = this.getDateBounds(query.date);
    const busyBookings = await this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.barber_id = :barberId", { barberId })
      .andWhere("booking.status <> :canceled", { canceled: BookingStatus.Canceled })
      .andWhere("booking.start_time < :dayEnd", { dayEnd })
      .andWhere("booking.end_time > :dayStart", { dayStart })
      .getMany();

    const slots = this.generateSlots({
      date: query.date,
      startTime: workWindow.startTime,
      endTime: workWindow.endTime,
      durationMin: service.durationMin,
      busyBookings,
    });

    return {
      date: query.date,
      barberId,
      serviceDuration: service.durationMin,
      slots,
    };
  }

  async createBooking(dto: CreateBookingDto, options?: { defaultStatus?: BookingStatus }) {
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

    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);
    await this.ensureWithinSchedule(dto.barberId, startTime, endTime);
    const managementToken = this.generateManageToken();
    const defaultStatus = options?.defaultStatus ?? BookingStatus.Pending;

    try {
      const booking = await this.dataSource.transaction("SERIALIZABLE", async (manager) => {
        const overlapCount = await manager
          .createQueryBuilder(BookingEntity, "booking")
          .where("booking.barber_id = :barberId", { barberId: dto.barberId })
          .andWhere("booking.status <> :canceled", { canceled: BookingStatus.Canceled })
          .andWhere("booking.start_time < :endTime", { endTime })
          .andWhere("booking.end_time > :startTime", { startTime })
          .getCount();

        if (overlapCount > 0) {
          throw new ConflictException("This slot is already booked");
        }

        const entity = manager.create(BookingEntity, {
          barberId: dto.barberId,
          serviceId: dto.serviceId,
          clientName: dto.clientName,
          clientPhone: dto.clientPhone,
          clientTelegramUsername: normalizeTelegramUsername(dto.clientTelegramUsername),
          clientManageToken: managementToken,
          startTime,
          endTime,
          notes: dto.notes ?? null,
          status: defaultStatus,
          cancellationReason: null,
          reminder24hSentAt: null,
          reminder2hSentAt: null,
        });

        return manager.save(entity);
      });

      const hydrated = await this.getBookingOrFail(booking.id);
      await this.telegramService.sendNewBookingAlert(hydrated);
      await this.telegramService.sendClientBookingAlert(hydrated);
      return {
        ...this.serializeBooking(hydrated),
        managementToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      const code = (error as { code?: string }).code;
      if (code === "23P01" || code === "40001") {
        throw new ConflictException("This slot is already booked");
      }

      throw error;
    }
  }

  async createAdminBooking(dto: CreateAdminBookingDto) {
    return this.createBooking(dto, {
      defaultStatus:
        dto.status === BookingStatus.Canceled || dto.status === BookingStatus.Completed
          ? BookingStatus.Confirmed
          : dto.status ?? BookingStatus.Confirmed,
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
    const saved = await this.bookingRepository.save(booking);
    await this.telegramService.sendStatusUpdateAlert(saved);
    await this.telegramService.sendClientStatusUpdate(saved);
    return this.serializeBooking(saved);
  }

  async rescheduleBooking(id: string, dto: RescheduleBookingDto) {
    const existing = await this.authorizePublicAccess(id, dto.token);
    if (existing.status === BookingStatus.Canceled || existing.status === BookingStatus.Completed) {
      throw new BadRequestException("This booking can no longer be rescheduled");
    }

    const barber = await this.barbersService.getOrFail(existing.barberId);
    const service = await this.servicesService.getOrFail(existing.serviceId);
    if (!barber.isActive || !service.isActive) {
      throw new BadRequestException("This booking cannot be rescheduled right now");
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);
    await this.ensureWithinSchedule(existing.barberId, startTime, endTime);

    try {
      const booking = await this.dataSource.transaction("SERIALIZABLE", async (manager) => {
        const overlapCount = await manager
          .createQueryBuilder(BookingEntity, "booking")
          .where("booking.barber_id = :barberId", { barberId: existing.barberId })
          .andWhere("booking.id <> :bookingId", { bookingId: existing.id })
          .andWhere("booking.status <> :canceled", { canceled: BookingStatus.Canceled })
          .andWhere("booking.start_time < :endTime", { endTime })
          .andWhere("booking.end_time > :startTime", { startTime })
          .getCount();

        if (overlapCount > 0) {
          throw new ConflictException("This slot is already booked");
        }

        existing.startTime = startTime;
        existing.endTime = endTime;
        existing.cancellationReason = null;
        existing.reminder24hSentAt = null;
        existing.reminder2hSentAt = null;
        return manager.save(existing);
      });

      const hydrated = await this.getBookingOrFail(booking.id);
      await this.telegramService.sendRescheduleAlert(hydrated);
      await this.telegramService.sendClientRescheduleAlert(hydrated);
      return this.serializeBooking(hydrated);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      const code = (error as { code?: string }).code;
      if (code === "23P01" || code === "40001") {
        throw new ConflictException("This slot is already booked");
      }

      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.getBookingOrFail(id);
    booking.status = dto.status;
    const saved = await this.bookingRepository.save(booking);
    await this.telegramService.sendStatusUpdateAlert(saved);
    await this.telegramService.sendClientStatusUpdate(saved);
    return saved;
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
    if (booking.clientManageToken !== token.trim()) {
      throw new UnauthorizedException("Invalid booking token");
    }

    return booking;
  }

  private getDateBounds(date: string) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    return { dayStart, dayEnd };
  }

  private async ensureWithinSchedule(barberId: string, startTime: Date, endTime: Date) {
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
    busyBookings: BookingEntity[];
  }) {
    const scheduleStart = combineDateAndTime(params.date, params.startTime);
    const scheduleEnd = combineDateAndTime(params.date, params.endTime);
    const nowThreshold = new Date(Date.now() + 30 * 60_000);

    const slots: string[] = [];
    let cursor = new Date(scheduleStart);

    while (cursor.getTime() + params.durationMin * 60_000 <= scheduleEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + params.durationMin * 60_000);
      const hasConflict = params.busyBookings.some(
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
      barberId: booking.barberId,
      serviceId: booking.serviceId,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      clientTelegramUsername: booking.clientTelegramUsername,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      notes: booking.notes,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
      barber: booking.barber,
      service: booking.service,
    };
  }

  private generateManageToken() {
    return randomBytes(24).toString("hex");
  }
}
