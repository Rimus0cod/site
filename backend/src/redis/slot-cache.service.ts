import { Injectable, Logger } from "@nestjs/common";
import { formatDatePart } from "../bookings/booking-rules";
import { RedisService } from "./redis.service";

const SLOT_CACHE_TTL_SECONDS = 30;
const SLOT_CACHE_PREFIX = "slots:availability";
const SLOT_CACHE_DATE_INDEX_PREFIX = "slots:index:date";
const SLOT_CACHE_BARBER_INDEX_PREFIX = "slots:index:barber";

export interface CachedSlotsPayload {
  date: string;
  barberId: string;
  serviceDuration: number;
  slots: string[];
}

@Injectable()
export class SlotCacheService {
  private readonly logger = new Logger(SlotCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async get(barberId: string, date: string, serviceId: string) {
    try {
      const raw = await this.redisService.getClient().get(this.getKey(barberId, date, serviceId));
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as CachedSlotsPayload;
      } catch (error) {
        this.logger.warn(
          `Failed to deserialize cached slots for barber=${barberId}, date=${date}, service=${serviceId}: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
        await this.redisService.getClient().del(this.getKey(barberId, date, serviceId));
        return null;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to read cached slots for barber=${barberId}, date=${date}, service=${serviceId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      return null;
    }
  }

  async set(barberId: string, date: string, serviceId: string, payload: CachedSlotsPayload) {
    try {
      const key = this.getKey(barberId, date, serviceId);
      const dateIndexKey = this.getDateIndexKey(barberId, date);
      const barberIndexKey = this.getBarberIndexKey(barberId);
      const client = this.redisService.getClient();
      const pipeline = client.multi();

      pipeline.set(key, JSON.stringify(payload), "EX", SLOT_CACHE_TTL_SECONDS);
      pipeline.sadd(dateIndexKey, key);
      pipeline.expire(dateIndexKey, SLOT_CACHE_TTL_SECONDS + 60);
      pipeline.sadd(barberIndexKey, key);
      pipeline.expire(barberIndexKey, SLOT_CACHE_TTL_SECONDS + 60);

      await pipeline.exec();
    } catch (error) {
      this.logger.warn(
        `Failed to cache slots for barber=${barberId}, date=${date}, service=${serviceId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  async invalidateDate(barberId: string, date: string) {
    try {
      const client = this.redisService.getClient();
      const dateIndexKey = this.getDateIndexKey(barberId, date);
      const barberIndexKey = this.getBarberIndexKey(barberId);
      const keys = await client.smembers(dateIndexKey);
      const pipeline = client.multi();

      pipeline.del(dateIndexKey);
      if (keys.length > 0) {
        pipeline.del(...keys);
        pipeline.srem(barberIndexKey, ...keys);
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate slot cache for barber=${barberId}, date=${date}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  async invalidateWindow(barberId: string, startTime: Date, endTime?: Date | null) {
    const dates = this.collectDates(startTime, endTime ?? startTime);
    await Promise.all(dates.map((date) => this.invalidateDate(barberId, date)));
  }

  async invalidateBarber(barberId: string) {
    try {
      const client = this.redisService.getClient();
      const barberIndexKey = this.getBarberIndexKey(barberId);
      const keys = await client.smembers(barberIndexKey);
      const pipeline = client.multi();

      pipeline.del(barberIndexKey);
      if (keys.length > 0) {
        pipeline.del(...keys);
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate slot cache for barber=${barberId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  private collectDates(startTime: Date, endTime: Date) {
    const dates = new Set<string>([formatDatePart(startTime), formatDatePart(endTime)]);
    return [...dates];
  }

  private getKey(barberId: string, date: string, serviceId: string) {
    return `${SLOT_CACHE_PREFIX}:${barberId}:${date}:${serviceId}`;
  }

  private getDateIndexKey(barberId: string, date: string) {
    return `${SLOT_CACHE_DATE_INDEX_PREFIX}:${barberId}:${date}`;
  }

  private getBarberIndexKey(barberId: string) {
    return `${SLOT_CACHE_BARBER_INDEX_PREFIX}:${barberId}`;
  }
}
