import { Controller, Get, Header, Res } from "@nestjs/common";
import type { Response } from "express";
import { MonitoringService } from "./monitoring.service";

@Controller("metrics")
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get()
  async getMetrics(@Res() response: Response) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", this.monitoringService.getContentType());
    response.send(await this.monitoringService.getMetrics());
  }
}
