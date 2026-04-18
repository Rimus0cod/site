import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BarberEntity } from "./barber.entity";
import { BarbersController } from "./barbers.controller";
import { BarbersService } from "./barbers.service";

@Module({
  imports: [TypeOrmModule.forFeature([BarberEntity])],
  controllers: [BarbersController],
  providers: [BarbersService],
  exports: [BarbersService, TypeOrmModule],
})
export class BarbersModule {}

