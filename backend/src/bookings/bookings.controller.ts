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
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { BookingsService } from "./bookings.service";
import { CancelBookingDto } from "./dto/cancel-booking.dto";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { CreateAdminBookingDto } from "./dto/create-admin-booking.dto";
import { GetSlotsQueryDto } from "./dto/get-slots-query.dto";
import { GetPublicBookingQueryDto } from "./dto/get-public-booking-query.dto";
import { ListAdminBookingsQueryDto } from "./dto/list-admin-bookings-query.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(PublicThrottleGuard)
  @Get("barbers/:id/slots")
  getSlots(
    @Param("id", ParseUUIDPipe) barberId: string,
    @Query() query: GetSlotsQueryDto,
  ) {
    return this.bookingsService.getAvailableSlots(barberId, query);
  }

  @UseGuards(PublicThrottleGuard)
  @Post("bookings")
  createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }

  @UseGuards(PublicThrottleGuard)
  @Get("bookings/:id")
  getBooking(@Param("id", ParseUUIDPipe) id: string, @Query() query: GetPublicBookingQueryDto) {
    return this.bookingsService.getPublicBooking(id, query.token);
  }

  @UseGuards(PublicThrottleGuard)
  @Post("bookings/:id/cancel")
  cancelBooking(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancelBooking(id, dto);
  }

  @UseGuards(PublicThrottleGuard)
  @Patch("bookings/:id/reschedule")
  rescheduleBooking(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.rescheduleBooking(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/bookings")
  listAdminBookings(@Query() query: ListAdminBookingsQueryDto) {
    return this.bookingsService.listAdminBookings(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/bookings")
  createAdminBooking(@Body() dto: CreateAdminBookingDto) {
    return this.bookingsService.createAdminBooking(dto);
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
