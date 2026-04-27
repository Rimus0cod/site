import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getReadyHealth();
  }

  @Get("live")
  getLiveHealth() {
    return this.healthService.getLiveHealth();
  }

  @Get("ready")
  getReadyHealth() {
    return this.healthService.getReadyHealth();
  }
}
