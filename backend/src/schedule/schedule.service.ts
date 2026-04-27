import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BarbersService } from "../barbers/barbers.service";
import { isPositiveRange } from "../bookings/booking-rules";
import { SlotCacheService } from "../redis/slot-cache.service";
import { ScheduleExceptionEntity } from "./schedule-exception.entity";
import { UpdateScheduleExceptionsDto } from "./dto/update-schedule-exceptions.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { WorkScheduleEntity } from "./work-schedule.entity";

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(WorkScheduleEntity)
    private readonly scheduleRepository: Repository<WorkScheduleEntity>,
    @InjectRepository(ScheduleExceptionEntity)
    private readonly scheduleExceptionRepository: Repository<ScheduleExceptionEntity>,
    private readonly barbersService: BarbersService,
    private readonly slotCacheService: SlotCacheService,
  ) {}

  async getBarberSchedule(barberId: string) {
    await this.barbersService.getOrFail(barberId);

    const schedules = await this.scheduleRepository.find({
      where: { barberId },
      order: { dayOfWeek: "ASC" },
    });

    return {
      barberId,
      days: schedules,
    };
  }

  async getBarberScheduleExceptions(barberId: string) {
    await this.barbersService.getOrFail(barberId);

    const exceptions = await this.scheduleExceptionRepository.find({
      where: { barberId },
      order: { date: "ASC" },
    });

    return {
      barberId,
      exceptions,
    };
  }

  async replaceSchedule(barberId: string, dto: UpdateScheduleDto) {
    await this.barbersService.getOrFail(barberId);

    const daySet = new Set<number>();
    for (const day of dto.days) {
      if (daySet.has(day.dayOfWeek)) {
        throw new BadRequestException("Schedule contains duplicate days");
      }
      daySet.add(day.dayOfWeek);

      if (!day.isDayOff && (!day.startTime || !day.endTime)) {
        throw new BadRequestException("Working day requires startTime and endTime");
      }

      if (!day.isDayOff && !isPositiveRange(day.startTime, day.endTime)) {
        throw new BadRequestException("Working day requires endTime after startTime");
      }
    }

    await this.scheduleRepository.delete({ barberId });
    const entities = dto.days.map((day) =>
      this.scheduleRepository.create({
        barberId,
        dayOfWeek: day.dayOfWeek,
        startTime: day.isDayOff ? null : day.startTime ?? null,
        endTime: day.isDayOff ? null : day.endTime ?? null,
        isDayOff: day.isDayOff ?? false,
      }),
    );

    const saved = await this.scheduleRepository.save(entities);
    await this.slotCacheService.invalidateBarber(barberId);
    return {
      barberId,
      days: saved.sort((left, right) => left.dayOfWeek - right.dayOfWeek),
    };
  }

  async replaceScheduleExceptions(barberId: string, dto: UpdateScheduleExceptionsDto) {
    await this.barbersService.getOrFail(barberId);

    const dateSet = new Set<string>();
    for (const exception of dto.exceptions) {
      if (dateSet.has(exception.date)) {
        throw new BadRequestException("Schedule exceptions contain duplicate dates");
      }
      dateSet.add(exception.date);

      if (!exception.isDayOff && (!exception.startTime || !exception.endTime)) {
        throw new BadRequestException("Working exception requires startTime and endTime");
      }

      if (!exception.isDayOff && !isPositiveRange(exception.startTime, exception.endTime)) {
        throw new BadRequestException("Exception endTime must be after startTime");
      }
    }

    await this.scheduleExceptionRepository.delete({ barberId });
    const entities = dto.exceptions.map((exception) =>
      this.scheduleExceptionRepository.create({
        barberId,
        date: exception.date,
        startTime: exception.isDayOff ? null : exception.startTime ?? null,
        endTime: exception.isDayOff ? null : exception.endTime ?? null,
        isDayOff: exception.isDayOff ?? false,
        note: exception.note?.trim() || null,
      }),
    );

    const saved = await this.scheduleExceptionRepository.save(entities);
    await this.slotCacheService.invalidateBarber(barberId);
    return {
      barberId,
      exceptions: saved.sort((left, right) => left.date.localeCompare(right.date)),
    };
  }
}
