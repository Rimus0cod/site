import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { BackupStatusService } from "../monitoring/backup-status.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly backupStatusService: BackupStatusService,
  ) {}

  getLiveHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV ?? "development",
    };
  }

  async getReadyHealth() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedisConnectivity(),
    ]);
    const backup = await this.backupStatusService.getStatus();

    const status = database === "up" && redis === "up" ? "ok" : "degraded";

    return {
      status,
      database,
      redis,
      backup,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV ?? "development",
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query("SELECT 1");
      return "up";
    } catch {
      return "down";
    }
  }

  private async checkRedisConnectivity() {
    try {
      await this.redisService.ping();
      return "up";
    } catch {
      return "down";
    }
  }
}
