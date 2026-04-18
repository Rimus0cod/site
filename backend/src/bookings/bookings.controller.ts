import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { GetSlotsQueryDto } from "./dto/get-slots-query.dto";
import { ListAdminBookingsQueryDto } from "./dto/list-admin-bookings-query.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get("barbers/:id/slots")
  getSlots(
    @Param("id", ParseUUIDPipe) barberId: string,
    @Query() query: GetSlotsQueryDto,
  ) {
    return this.bookingsService.getAvailableSlots(barberId, query);
  }

  @Post("bookings")
  createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }

  @Get("bookings/:id")
  getBooking(@Param("id", ParseUUIDPipe) id: string) {
    return this.bookingsService.getBooking(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/bookings")
  listAdminBookings(@Query() query: ListAdminBookingsQueryDto) {
    return this.bookingsService.listAdminBookings(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("admin/bookings/:id/status")
  updateBookingStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, dto);
  }
}

