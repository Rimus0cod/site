import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminAuditLogModule } from "../admin-audit/admin-audit-log.module";
import { ServiceEntity } from "./service.entity";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity]), AdminAuditLogModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService, TypeOrmModule],
})
export class ServicesModule {}
