import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { RedisService } from "./redis.service";

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

@Injectable()
export class RedisLockService {
  constructor(private readonly redisService: RedisService) {}

  async withLock(lockKey: string, ttlMs: number, work: () => Promise<void>) {
    const token = randomUUID();
    const client = this.redisService.getClient();
    const acquired = await client.set(lockKey, token, "PX", ttlMs, "NX");

    if (acquired !== "OK") {
      return false;
    }

    try {
      await work();
      return true;
    } finally {
      await client.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
    }
  }
}
