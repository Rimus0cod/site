import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
import { DataSource } from "typeorm";
import { RedisService } from "../redis/redis.service";
import { BackupStatusService } from "./backup-status.service";

const WORKER_TASKS = [
  "expire-stale-holds",
  "booking-reminders",
  "payment-reconciliation",
] as const;

type WorkerTaskName = (typeof WORKER_TASKS)[number];

@Injectable()
export class MonitoringService {
  private readonly registry = new Registry();
  private readonly httpRequestsTotal: Counter<"method" | "route" | "status_code">;
  private readonly httpRequestDurationSeconds: Histogram<"method" | "route" | "status_code">;
  private readonly componentReady: Gauge<"component">;
  private readonly backupLastSuccessTimestampSeconds: Gauge;
  private readonly backupAgeSeconds: Gauge;
  private readonly workerTaskLastSuccessTimestampSeconds: Gauge<"task">;
  private readonly workerTaskLastRunDurationSeconds: Gauge<"task">;
  private readonly workerTaskLastErrorTimestampSeconds: Gauge<"task">;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly backupStatusService: BackupStatusService,
  ) {
    collectDefaultMetrics({
      prefix: "barberbook_",
      register: this.registry,
    });

    this.httpRequestsTotal = new Counter({
      name: "barberbook_http_requests_total",
      help: "Total number of handled HTTP requests.",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: "barberbook_http_request_duration_seconds",
      help: "HTTP request latency in seconds.",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.componentReady = new Gauge({
      name: "barberbook_component_ready",
      help: "Component readiness status where 1 means ready.",
      labelNames: ["component"],
      registers: [this.registry],
    });

    this.backupLastSuccessTimestampSeconds = new Gauge({
      name: "barberbook_backup_last_success_timestamp_seconds",
      help: "Unix timestamp of the last successful PostgreSQL backup.",
      registers: [this.registry],
    });

    this.backupAgeSeconds = new Gauge({
      name: "barberbook_backup_age_seconds",
      help: "Age of the last successful PostgreSQL backup in seconds.",
      registers: [this.registry],
    });

    this.workerTaskLastSuccessTimestampSeconds = new Gauge({
      name: "barberbook_worker_task_last_success_timestamp_seconds",
      help: "Unix timestamp of the last successful worker task run.",
      labelNames: ["task"],
      registers: [this.registry],
    });

    this.workerTaskLastRunDurationSeconds = new Gauge({
      name: "barberbook_worker_task_last_run_duration_seconds",
      help: "Duration in seconds of the last successful worker task run.",
      labelNames: ["task"],
      registers: [this.registry],
    });

    this.workerTaskLastErrorTimestampSeconds = new Gauge({
      name: "barberbook_worker_task_last_error_timestamp_seconds",
      help: "Unix timestamp of the last observed worker task failure.",
      labelNames: ["task"],
      registers: [this.registry],
    });
  }

  getContentType() {
    return this.registry.contentType;
  }

  async getMetrics() {
    await this.collectOperationalMetrics();
    return this.registry.metrics();
  }

  recordHttpRequest(payload: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
  }) {
    const labels = {
      method: payload.method.toUpperCase(),
      route: this.normalizeRoute(payload.route),
      status_code: String(payload.statusCode),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, payload.durationMs / 1000);
  }

  private normalizeRoute(route: string) {
    const normalized = route.trim();
    return normalized.length > 0 ? normalized : "unknown";
  }

  private async collectOperationalMetrics() {
    const [databaseReady, redisReady, backupStatus] = await Promise.all([
      this.checkDatabaseReady(),
      this.checkRedisReady(),
      this.backupStatusService.getStatus(),
    ]);

    this.componentReady.set({ component: "database" }, databaseReady ? 1 : 0);
    this.componentReady.set({ component: "redis" }, redisReady ? 1 : 0);
    this.componentReady.set({ component: "backup" }, backupStatus.status === "fresh" ? 1 : 0);

    if (backupStatus.lastSuccessAt) {
      this.backupLastSuccessTimestampSeconds.set(
        Math.floor(new Date(backupStatus.lastSuccessAt).getTime() / 1000),
      );
    } else {
      this.backupLastSuccessTimestampSeconds.set(0);
    }

    this.backupAgeSeconds.set(backupStatus.ageSeconds ?? 0);

    await this.collectWorkerTaskMetrics();
  }

  private async checkDatabaseReady() {
    try {
      await this.dataSource.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisReady() {
    try {
      await this.redisService.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async collectWorkerTaskMetrics() {
    try {
      const client = this.redisService.getClient();
      const pairs = WORKER_TASKS.flatMap((task) => [
        this.workerMetricKey(task, "last_success_ms"),
        this.workerMetricKey(task, "last_duration_ms"),
        this.workerMetricKey(task, "last_error_ms"),
      ]);
      const values = await client.mget(pairs);

      WORKER_TASKS.forEach((task, index) => {
        const offset = index * 3;
        this.setWorkerMetric(
          this.workerTaskLastSuccessTimestampSeconds,
          task,
          this.toSeconds(values[offset]),
        );
        this.setWorkerMetric(
          this.workerTaskLastRunDurationSeconds,
          task,
          this.toDurationSeconds(values[offset + 1]),
        );
        this.setWorkerMetric(
          this.workerTaskLastErrorTimestampSeconds,
          task,
          this.toSeconds(values[offset + 2]),
        );
      });
    } catch {
      WORKER_TASKS.forEach((task) => {
        this.setWorkerMetric(this.workerTaskLastSuccessTimestampSeconds, task, 0);
        this.setWorkerMetric(this.workerTaskLastRunDurationSeconds, task, 0);
        this.setWorkerMetric(this.workerTaskLastErrorTimestampSeconds, task, 0);
      });
    }
  }

  private workerMetricKey(
    task: WorkerTaskName,
    field: "last_success_ms" | "last_duration_ms" | "last_error_ms",
  ) {
    return `monitoring:worker:${task}:${field}`;
  }

  private setWorkerMetric(gauge: Gauge<"task">, task: WorkerTaskName, value: number) {
    gauge.set({ task }, value);
  }

  private toSeconds(value: string | null) {
    const numeric = Number(value ?? 0);
    return numeric > 0 ? numeric / 1000 : 0;
  }

  private toDurationSeconds(value: string | null) {
    const numeric = Number(value ?? 0);
    return numeric > 0 ? numeric / 1000 : 0;
  }
}
