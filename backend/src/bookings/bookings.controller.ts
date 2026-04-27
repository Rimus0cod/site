import {
  Body,
  Controller,
  GoneException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AdminAuditRequest } from "../admin-audit/admin-audit-log.service";
import { AdminAuditLogService } from "../admin-audit/admin-audit-log.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalClientJwtAuthGuard } from "../client-auth/optional-client-jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { BookingsService } from "./bookings.service";
import { CancelBookingDto } from "./dto/cancel-booking.dto";
import { CreateAdminBookingDto } from "./dto/create-admin-booking.dto";
import { GetSlotsQueryDto } from "./dto/get-slots-query.dto";
import { GetPublicBookingQueryDto } from "./dto/get-public-booking-query.dto";
import { ListAdminBookingsQueryDto } from "./dto/list-admin-bookings-query.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

@Controller()
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly adminAuditLogService: AdminAuditLogService,
  ) {}

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
  @UseGuards(OptionalClientJwtAuthGuard)
  createBookingDeprecated() {
    throw new GoneException("Public direct booking is disabled. Create a booking hold first.");
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
  async createAdminBooking(@Body() dto: CreateAdminBookingDto, @Req() request: AdminAuditRequest) {
    const booking = await this.bookingsService.createAdminBooking(dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "create",
      resource: "booking",
      resourceId: booking.id,
      summary: `Created admin booking for ${booking.clientName}`,
      metadata: {
        barberId: booking.barberId,
        serviceId: booking.serviceId,
        startTime: booking.startTime,
        status: booking.status,
      },
    });
    return booking;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("admin/bookings/:id/status")
  async updateBookingStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() request: AdminAuditRequest,
  ) {
    const booking = await this.bookingsService.updateStatus(id, dto);
    await this.adminAuditLogService.recordFromRequest(request, {
      action: "status_update",
      resource: "booking",
      resourceId: booking.id,
      summary: `Updated booking ${booking.id} status to ${booking.status}`,
      metadata: {
        clientName: booking.clientName,
        startTime: booking.startTime,
        status: booking.status,
      },
    });
    return booking;
  }
}
