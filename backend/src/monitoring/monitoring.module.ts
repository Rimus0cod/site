import { Global, Module } from "@nestjs/common";
import { MonitoringController } from "./monitoring.controller";
import { BackupStatusService } from "./backup-status.service";
import { MonitoringService } from "./monitoring.service";

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [BackupStatusService, MonitoringService],
  exports: [BackupStatusService, MonitoringService],
})
export class MonitoringModule {}
