import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>("redis.host", "redis"),
      port: this.configService.get<number>("redis.port", 6379),
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on("error", (error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  getClient() {
    return this.client;
  }

  async ping() {
    return this.client.ping();
  }

  async onModuleDestroy() {
    if (this.client.status === "end") {
      return;
    }

    await this.client.quit().catch(() => this.client.disconnect());
  }
}
