import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { OptionalClientJwtAuthGuard } from "../client-auth/optional-client-jwt-auth.guard";
import type { ClientSessionUser } from "../client-auth/client-jwt.strategy";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { BookingHoldsService } from "./booking-holds.service";
import { CreateBookingHoldDto } from "./dto/create-booking-hold.dto";
import { GetPublicHoldQueryDto } from "./dto/get-public-hold-query.dto";

@Controller("booking-holds")
export class BookingHoldsController {
  constructor(private readonly bookingHoldsService: BookingHoldsService) {}

  @UseGuards(PublicThrottleGuard, OptionalClientJwtAuthGuard)
  @Post()
  createHold(@Body() dto: CreateBookingHoldDto, @Req() request: { user?: ClientSessionUser | null }) {
    return this.bookingHoldsService.createHold(dto, request.user ?? null);
  }

  @UseGuards(PublicThrottleGuard)
  @Get(":id")
  getHold(@Param("id", ParseUUIDPipe) id: string, @Query() query: GetPublicHoldQueryDto) {
    return this.bookingHoldsService.getPublicHold(id, query.token);
  }
}
