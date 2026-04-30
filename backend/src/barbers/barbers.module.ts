import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminAuditLogModule } from "../admin-audit/admin-audit-log.module";
import { BarberEntity } from "./barber.entity";
import { BarbersController } from "./barbers.controller";
import { BarbersService } from "./barbers.service";

@Module({
  imports: [TypeOrmModule.forFeature([BarberEntity]), AdminAuditLogModule],
  controllers: [BarbersController],
  providers: [BarbersService],
  exports: [BarbersService, TypeOrmModule],
})
export class BarbersModule {}
