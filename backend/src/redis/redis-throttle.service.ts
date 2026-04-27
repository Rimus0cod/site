import { Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";

const CONSUME_THROTTLE_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("PTTL", KEYS[1])
local allowed = 0
if current <= tonumber(ARGV[1]) then
  allowed = 1
end
return {current, ttl, allowed}
`;

@Injectable()
export class RedisThrottleService {
  constructor(private readonly redisService: RedisService) {}

  async consume(key: string, limit: number, windowMs: number) {
    const client = this.redisService.getClient();
    const result = (await client.eval(
      CONSUME_THROTTLE_SCRIPT,
      1,
      key,
      String(limit),
      String(windowMs),
    )) as [number, number, number];
    const current = Number(result[0] ?? 0);
    const ttlMs = Math.max(Number(result[1] ?? 0), 0);
    const allowed = Number(result[2] ?? 0) === 1;

    return {
      allowed,
      current,
      ttlMs,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
      remaining: Math.max(limit - current, 0),
    };
  }
}
