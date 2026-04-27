import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Request } from "express";
import { Repository } from "typeorm";
import { AdminAuditLogEntity } from "./admin-audit-log.entity";
import { ListAdminAuditLogsQueryDto } from "./dto/list-admin-audit-logs-query.dto";

type AdminActor = {
  id: string;
  email: string;
  role: string;
};

export type AdminAuditRequest = Request & {
  requestId?: string;
  user?: AdminActor;
};

type RecordAdminAuditLogInput = {
  adminId: string | null;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  summary: string;
  requestId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class AdminAuditLogService {
  private readonly logger = new Logger(AdminAuditLogService.name);

  constructor(
    @InjectRepository(AdminAuditLogEntity)
    private readonly adminAuditLogRepository: Repository<AdminAuditLogEntity>,
  ) {}

  async list(query: ListAdminAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.adminAuditLogRepository
      .createQueryBuilder("audit")
      .orderBy("audit.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (query.resource) {
      qb.andWhere("audit.resource = :resource", { resource: query.resource.trim() });
    }

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

  async recordFromRequest(
    request: AdminAuditRequest,
    input: Omit<RecordAdminAuditLogInput, "adminId" | "adminEmail" | "ip" | "requestId">,
  ) {
    if (!request.user?.id || !request.user.email) {
      return;
    }

    await this.record({
      ...input,
      adminId: request.user.id,
      adminEmail: request.user.email,
      requestId: request.requestId ?? null,
      ip: this.normalizeIp(request.ip),
    });
  }

  async record(input: RecordAdminAuditLogInput) {
    try {
      await this.adminAuditLogRepository.save(
        this.adminAuditLogRepository.create({
          adminId: input.adminId,
          adminEmail: input.adminEmail,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId ?? null,
          summary: input.summary,
          requestId: input.requestId ?? null,
          ip: input.ip ?? null,
          metadata: input.metadata ?? null,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Failed to persist admin audit log: ${message}`);
    }
  }

  private normalizeIp(ip?: string | null) {
    return ip?.trim() ? ip.trim() : null;
  }
}

