import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BarbersService } from "./barbers.service";
import { CreateBarberDto } from "./dto/create-barber.dto";
import { UpdateBarberDto } from "./dto/update-barber.dto";

@Controller()
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

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
  createBarber(@Body() dto: CreateBarberDto) {
    return this.barbersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("admin/barbers/:id")
  updateBarber(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBarberDto) {
    return this.barbersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("admin/barbers/:id")
  deleteBarber(@Param("id", ParseUUIDPipe) id: string) {
    return this.barbersService.remove(id);
  }
}

