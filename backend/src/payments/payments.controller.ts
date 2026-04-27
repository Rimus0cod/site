import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { CompleteMockPaymentDto } from "./dto/complete-mock-payment.dto";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { PaymentsService } from "./payments.service";

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(PublicThrottleGuard)
  @Post("checkout")
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(dto);
  }

  @Post("webhooks/:provider")
  handleWebhook(
    @Param("provider") provider: string,
    @Body() payload: Record<string, unknown>,
    @Req() request: RawBodyRequest,
  ) {
    return this.paymentsService.handleWebhook(provider, payload, {
      headers: request.headers,
      rawBody: request.rawBody ?? null,
    });
  }

  @UseGuards(PublicThrottleGuard)
  @Post("mock/:paymentId/complete")
  completeMockPayment(
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @Body() dto: CompleteMockPaymentDto,
  ) {
    return this.paymentsService.completeMockPayment(paymentId, dto.token);
  }
}
