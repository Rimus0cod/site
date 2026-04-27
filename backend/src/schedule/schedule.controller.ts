import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AdminAuditRequest } from "../admin-audit/admin-audit-log.service";
import { AdminAuditLogService } from "../admin-audit/admin-audit-log.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateScheduleExceptionsDto } from "./dto/update-schedule-exceptions.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { ScheduleService } from "./schedule.service";

@Controller()
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly adminAuditLogService: AdminAuditLogService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/barbers/:id/schedule")
  getBarberSchedule(@Param("id", ParseUUIDPipe) barberId: string) {
    return this.scheduleService.getBarberSchedule(barberId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/barbers/:id/schedule/exceptions")
  getBarberScheduleExceptions(@Param("id", ParseUUIDPipe) barberId: string) {
    return this.scheduleService.getBarberScheduleExceptions(barberId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Put("admin/barbers/:id/schedule")
  async replaceSchedule(
    @Param("id", ParseUUIDPipe) barberId: string,
    @Body() dto: UpdateScheduleDto,
    @Req() request: AdminAuditRequest,
  ) {
    const result = await this.scheduleService.replaceSchedule(barberId, dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "replace",
      resource: "schedule",
      resourceId: barberId,
      summary: `Replaced weekly schedule for barber ${barberId}`,
      metadata: {
        dayCount: result.days.length,
        days: result.days,
      },
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Put("admin/barbers/:id/schedule/exceptions")
  async replaceScheduleExceptions(
    @Param("id", ParseUUIDPipe) barberId: string,
    @Body() dto: UpdateScheduleExceptionsDto,
    @Req() request: AdminAuditRequest,
  ) {
    const result = await this.scheduleService.replaceScheduleExceptions(barberId, dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "replace",
      resource: "schedule_exception",
      resourceId: barberId,
      summary: `Replaced schedule exceptions for barber ${barberId}`,
      metadata: {
        exceptionCount: result.exceptions.length,
        exceptions: result.exceptions,
      },
    });
    return result;
  }
}
