import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { RedisThrottleService } from "../redis/redis-throttle.service";

@Injectable()
export class AdminLoginThrottleGuard implements CanActivate {
  private static readonly limit = 8;
  private static readonly windowMs = 15 * 60_000;

  constructor(private readonly redisThrottleService: RedisThrottleService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      body?: { email?: unknown };
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }>();

    const email = this.normalizeEmail(request.body?.email);
    const ip = this.extractIp(request);
    const bucketKey = `throttle:admin-login:${ip}:${email}`;
    const throttle = await this.redisThrottleService.consume(
      bucketKey,
      AdminLoginThrottleGuard.limit,
      AdminLoginThrottleGuard.windowMs,
    );

    if (!throttle.allowed) {
      throw new HttpException(
        {
          message: "Too many login attempts. Please wait a bit before trying again.",
          retryAfterSeconds: throttle.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private normalizeEmail(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : "unknown";
  }

  private extractIp(request: {
    ip?: string;
    socket?: { remoteAddress?: string };
  }) {
    return request.ip ?? request.socket?.remoteAddress ?? "unknown";
  }
}
