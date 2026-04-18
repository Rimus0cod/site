import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { ScheduleService } from "./schedule.service";

@Controller()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/barbers/:id/schedule")
  getBarberSchedule(@Param("id", ParseUUIDPipe) barberId: string) {
    return this.scheduleService.getBarberSchedule(barberId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Put("admin/barbers/:id/schedule")
  replaceSchedule(
    @Param("id", ParseUUIDPipe) barberId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.replaceSchedule(barberId, dto);
  }
}

