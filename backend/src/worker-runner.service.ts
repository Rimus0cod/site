import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BookingHoldExpirationService } from "./booking-holds/booking-hold-expiration.service";
import { BookingRemindersService } from "./bookings/booking-reminders.service";
import { PaymentReconciliationService } from "./payments/payment-reconciliation.service";
import { RedisLockService } from "./redis/redis-lock.service";
import { RedisService } from "./redis/redis.service";

interface ScheduledTask {
  name: string;
  everyMs: number;
  lockTtlMs: number;
  run: () => Promise<void>;
}

@Injectable()
export class WorkerRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerRunnerService.name);
  private readonly intervalHandles: NodeJS.Timeout[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisLockService: RedisLockService,
    private readonly redisService: RedisService,
    private readonly bookingHoldExpirationService: BookingHoldExpirationService,
    private readonly bookingRemindersService: BookingRemindersService,
    private readonly paymentReconciliationService: PaymentReconciliationService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    const paymentEveryMs = this.configService.get<number>("payments.reconciliationIntervalMs", 300000);
    const tasks: ScheduledTask[] = [
      {
        name: "expire-stale-holds",
        everyMs: 60_000,
        lockTtlMs: 120_000,
        run: () => this.bookingHoldExpirationService.runExpirationCycle(),
      },
      {
        name: "booking-reminders",
        everyMs: 60_000,
        lockTtlMs: 180_000,
        run: () => this.bookingRemindersService.flushUpcomingReminders(),
      },
      {
        name: "payment-reconciliation",
        everyMs: paymentEveryMs,
        lockTtlMs: Math.max(paymentEveryMs * 2, 300_000),
        run: () => this.paymentReconciliationService.reconcile(),
      },
    ];

    for (const task of tasks) {
      this.scheduleTask(task);
    }

    this.logger.log(`Worker started with ${tasks.length} scheduled task(s).`);
  }

  onModuleDestroy() {
    for (const intervalHandle of this.intervalHandles) {
      clearInterval(intervalHandle);
    }

    this.intervalHandles.length = 0;
  }

  private scheduleTask(task: ScheduledTask) {
    void this.runTask(task);

    const intervalHandle = setInterval(() => {
      void this.runTask(task);
    }, task.everyMs);

    this.intervalHandles.push(intervalHandle);
  }

  private async runTask(task: ScheduledTask) {
    const client = this.redisService.getClient();
    const startedAt = Date.now();

    try {
      const executed = await this.redisLockService.withLock(
        `worker:lock:${task.name}`,
        task.lockTtlMs,
        async () => {
          await task.run();
          const finishedAt = Date.now();
          await client.mset({
            [this.workerMetricKey(task.name, "last_success_ms")]: String(finishedAt),
            [this.workerMetricKey(task.name, "last_duration_ms")]: String(finishedAt - startedAt),
          });
        },
      );

      if (!executed) {
        this.logger.debug(`Skipped ${task.name} because another worker owns the lock.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown worker task error";
      await client.set(this.workerMetricKey(task.name, "last_error_ms"), String(Date.now()));
      this.logger.warn(`Worker task ${task.name} failed: ${message}`);
    }
  }

  private workerMetricKey(
    taskName: string,
    field: "last_success_ms" | "last_duration_ms" | "last_error_ms",
  ) {
    return `monitoring:worker:${taskName}:${field}`;
  }
}
