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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServicesService } from "./services.service";

@Controller()
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly adminAuditLogService: AdminAuditLogService,
  ) {}

  @Get("services")
  getPublicServices() {
    return this.servicesService.listPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/services")
  getAdminServices() {
    return this.servicesService.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/services")
  async createService(@Body() dto: CreateServiceDto, @Req() request: AdminAuditRequest) {
    const service = await this.servicesService.create(dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "create",
      resource: "service",
      resourceId: service.id,
      summary: `Created service "${service.name}"`,
      metadata: {
        price: service.price,
        durationMin: service.durationMin,
        paymentPolicy: service.paymentPolicy,
      },
    });
    return service;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("admin/services/:id")
  async updateService(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @Req() request: AdminAuditRequest,
  ) {
    const service = await this.servicesService.update(id, dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "update",
      resource: "service",
      resourceId: service.id,
      summary: `Updated service "${service.name}"`,
      metadata: {
        changes: dto,
        price: service.price,
        durationMin: service.durationMin,
        paymentPolicy: service.paymentPolicy,
      },
    });
    return service;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("admin/services/:id")
  async deleteService(@Param("id", ParseUUIDPipe) id: string, @Req() request: AdminAuditRequest) {
    const service = await this.servicesService.getOrFail(id);
    const result = await this.servicesService.remove(id);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "delete",
      resource: "service",
      resourceId: id,
      summary: `Deleted service "${service.name}"`,
      metadata: {
        price: service.price,
        durationMin: service.durationMin,
        paymentPolicy: service.paymentPolicy,
      },
    });
    return result;
  }
}
