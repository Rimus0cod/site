import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Not, Repository } from "typeorm";
import { BarbersService } from "../barbers/barbers.service";
import { BookingStatus } from "../common/enums/booking-status.enum";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { ServicesService } from "../services/services.service";
import { TelegramService } from "../telegram/telegram.service";
import { BookingEntity } from "./booking.entity";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { GetSlotsQueryDto } from "./dto/get-slots-query.dto";
import { ListAdminBookingsQueryDto } from "./dto/list-admin-bookings-query.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

const SLOT_STEP_MINUTES = 30;

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(WorkScheduleEntity)
    private readonly scheduleRepository: Repository<WorkScheduleEntity>,
    private readonly dataSource: DataSource,
    private readonly barbersService: BarbersService,
    private readonly servicesService: ServicesService,
    private readonly telegramService: TelegramService,
  ) {}

  async getBooking(id: string) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    return booking;
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

    return qb.getMany();
  }

  async getAvailableSlots(barberId: string, query: GetSlotsQueryDto) {
    await this.barbersService.getOrFail(barberId);
    const service = await this.servicesService.getOrFail(query.serviceId);

    const date = new Date(`${query.date}T00:00:00`);
    const dayOfWeek = date.getDay();
    const schedule = await this.scheduleRepository.findOne({
      where: { barberId, dayOfWeek },
    });

    if (!schedule || schedule.isDayOff || !schedule.startTime || !schedule.endTime) {
      return {
        date: query.date,
        barberId,
        serviceDuration: service.durationMin,
        slots: [],
      };
    }

    const { dayStart, dayEnd } = this.getDateBounds(query.date);
    const bookings = await this.bookingRepository.find({
      where: {
        barberId,
        status: Not(BookingStatus.Canceled),
      },
    });

    const busyBookings = bookings.filter(
      (booking) => booking.startTime < dayEnd && booking.endTime > dayStart,
    );

    const slots = this.generateSlots({
      date: query.date,
      schedule,
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

  async createBooking(dto: CreateBookingDto) {
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
          clientTelegramUsername: this.normalizeTelegramUsername(dto.clientTelegramUsername),
          startTime,
          endTime,
          notes: dto.notes ?? null,
          status: BookingStatus.Pending,
        });

        return manager.save(entity);
      });

      const hydrated = await this.getBooking(booking.id);
      await this.telegramService.sendNewBookingAlert(hydrated);
      await this.telegramService.sendClientBookingAlert(hydrated);
      return hydrated;
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
    const booking = await this.getBooking(id);
    booking.status = dto.status;
    const saved = await this.bookingRepository.save(booking);
    await this.telegramService.sendStatusUpdateAlert(saved);
    await this.telegramService.sendClientStatusUpdate(saved);
    return saved;
  }

  private normalizeTelegramUsername(username?: string) {
    if (!username) {
      return null;
    }

    const normalized = username.trim().replace(/^@+/, "").toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private getDateBounds(date: string) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    return { dayStart, dayEnd };
  }

  private async ensureWithinSchedule(barberId: string, startTime: Date, endTime: Date) {
    const dateString = this.formatDate(startTime);
    const dayOfWeek = startTime.getDay();
    const schedule = await this.scheduleRepository.findOne({
      where: { barberId, dayOfWeek },
    });

    if (!schedule || schedule.isDayOff || !schedule.startTime || !schedule.endTime) {
      throw new BadRequestException("Barber does not work on the selected date");
    }

    const scheduleStart = this.combineDateAndTime(dateString, schedule.startTime);
    const scheduleEnd = this.combineDateAndTime(dateString, schedule.endTime);
    if (startTime < scheduleStart || endTime > scheduleEnd) {
      throw new BadRequestException("Booking is outside working hours");
    }
  }

  private generateSlots(params: {
    date: string;
    schedule: WorkScheduleEntity;
    durationMin: number;
    busyBookings: BookingEntity[];
  }) {
    const scheduleStart = this.combineDateAndTime(params.date, params.schedule.startTime as string);
    const scheduleEnd = this.combineDateAndTime(params.date, params.schedule.endTime as string);
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
        slots.push(this.formatDateTime(slotStart));
      }

      cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60_000);
    }

    return slots;
  }

  private combineDateAndTime(date: string, time: string) {
    const normalizedTime = this.normalizeTime(time);
    return new Date(`${date}T${normalizedTime}`);
  }

  private normalizeTime(time: string) {
    const trimmed = time.trim();
    if (/^\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }

    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    throw new BadRequestException(`Invalid time format: ${time}`);
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private formatDateTime(date: Date) {
    const datePart = this.formatDate(date);
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    return `${datePart}T${hours}:${minutes}:00`;
  }
}
