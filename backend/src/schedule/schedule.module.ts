import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminAuditLogModule } from "../admin-audit/admin-audit-log.module";
import { BarbersModule } from "../barbers/barbers.module";
import { ScheduleExceptionEntity } from "./schedule-exception.entity";
import { WorkScheduleEntity } from "./work-schedule.entity";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";

@Module({
  imports: [TypeOrmModule.forFeature([WorkScheduleEntity, ScheduleExceptionEntity]), BarbersModule, AdminAuditLogModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService, TypeOrmModule],
})
export class ScheduleModule {}
