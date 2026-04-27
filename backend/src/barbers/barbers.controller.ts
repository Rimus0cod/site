import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AdminAuditRequest } from "../admin-audit/admin-audit-log.service";
import { AdminAuditLogService } from "../admin-audit/admin-audit-log.service";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BarbersService } from "./barbers.service";
import { CreateBarberDto } from "./dto/create-barber.dto";
import { UpdateBarberDto } from "./dto/update-barber.dto";

@Controller()
export class BarbersController {
  constructor(
    private readonly barbersService: BarbersService,
    private readonly adminAuditLogService: AdminAuditLogService,
  ) {}

  @Get("barbers")
  getPublicBarbers() {
    return this.barbersService.listPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/barbers")
  getAdminBarbers() {
    return this.barbersService.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/barbers")
  async createBarber(@Body() dto: CreateBarberDto, @Req() request: AdminAuditRequest) {
    const barber = await this.barbersService.create(dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "create",
      resource: "barber",
      resourceId: barber.id,
      summary: `Created barber "${barber.name}"`,
      metadata: {
        name: barber.name,
        isActive: barber.isActive,
      },
    });
    return barber;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("admin/barbers/:id")
  async updateBarber(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBarberDto,
    @Req() request: AdminAuditRequest,
  ) {
    const barber = await this.barbersService.update(id, dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "update",
      resource: "barber",
      resourceId: barber.id,
      summary: `Updated barber "${barber.name}"`,
      metadata: {
        changes: dto,
        isActive: barber.isActive,
      },
    });
    return barber;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("admin/barbers/:id")
  async deleteBarber(@Param("id", ParseUUIDPipe) id: string, @Req() request: AdminAuditRequest) {
    const barber = await this.barbersService.getOrFail(id);
    const result = await this.barbersService.remove(id);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "delete",
      resource: "barber",
      resourceId: id,
      summary: `Deleted barber "${barber.name}"`,
      metadata: {
        name: barber.name,
        isActive: barber.isActive,
      },
    });
    return result;
  }
}
