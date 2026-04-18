import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BarbersService } from "../barbers/barbers.service";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { WorkScheduleEntity } from "./work-schedule.entity";

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(WorkScheduleEntity)
    private readonly scheduleRepository: Repository<WorkScheduleEntity>,
    private readonly barbersService: BarbersService,
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
    return {
      barberId,
      days: saved.sort((left, right) => left.dayOfWeek - right.dayOfWeek),
    };
  }
}

