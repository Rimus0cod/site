import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminAuditLogService } from "./admin-audit-log.service";
import { ListAdminAuditLogsQueryDto } from "./dto/list-admin-audit-logs-query.dto";

@Controller("admin/audit-logs")
export class AdminAuditLogController {
  constructor(private readonly adminAuditLogService: AdminAuditLogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get()
  list(@Query() query: ListAdminAuditLogsQueryDto) {
    return this.adminAuditLogService.list(query);
  }
}

