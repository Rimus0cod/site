import { Global, Module } from "@nestjs/common";
import { RedisLockService } from "./redis-lock.service";
import { RedisService } from "./redis.service";
import { SlotCacheService } from "./slot-cache.service";
import { RedisThrottleService } from "./redis-throttle.service";

@Global()
@Module({
  providers: [RedisService, RedisLockService, RedisThrottleService, SlotCacheService],
  exports: [RedisService, RedisLockService, RedisThrottleService, SlotCacheService],
})
export class RedisModule {}
