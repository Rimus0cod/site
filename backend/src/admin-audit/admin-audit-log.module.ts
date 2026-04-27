import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminAuditLogController } from "./admin-audit-log.controller";
import { AdminAuditLogEntity } from "./admin-audit-log.entity";
import { AdminAuditLogService } from "./admin-audit-log.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLogEntity])],
  controllers: [AdminAuditLogController],
  providers: [AdminAuditLogService],
  exports: [AdminAuditLogService],
})
export class AdminAuditLogModule {}

