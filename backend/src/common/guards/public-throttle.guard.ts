import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { RedisThrottleService } from "../../redis/redis-throttle.service";

interface ThrottleRule {
  limit: number;
  windowMs: number;
  message: string;
}

@Injectable()
export class PublicThrottleGuard implements CanActivate {
  private readonly rules = new Map<string, ThrottleRule>([
    [
      "GET:/barbers/:id/slots",
      {
        limit: 45,
        windowMs: 60_000,
        message: "Too many slot checks. Please wait a minute and try again.",
      },
    ],
    [
      "POST:/booking-holds",
      {
        limit: 6,
        windowMs: 15 * 60_000,
        message: "Too many hold attempts. Please try again a bit later.",
      },
    ],
    [
      "POST:/payments/checkout",
      {
        limit: 8,
        windowMs: 15 * 60_000,
        message: "Too many checkout attempts. Please wait a minute and try again.",
      },
    ],
    [
      "POST:/payments/mock/:paymentId/complete",
      {
        limit: 10,
        windowMs: 15 * 60_000,
        message: "Too many mock payment confirmations. Please wait and try again.",
      },
    ],
    [
      "POST:/bookings",
      {
        limit: 6,
        windowMs: 15 * 60_000,
        message: "Too many booking attempts. Please try again a bit later.",
      },
    ],
    [
      "POST:/client-auth/register",
      {
        limit: 5,
        windowMs: 30 * 60_000,
        message: "Too many registration attempts. Please try again later.",
      },
    ],
    [
      "POST:/client-auth/login",
      {
        limit: 8,
        windowMs: 15 * 60_000,
        message: "Too many login attempts. Please wait a minute and try again.",
      },
    ],
    [
      "GET:/bookings/:id",
      {
        limit: 30,
        windowMs: 5 * 60_000,
        message: "Too many booking lookups. Please slow down and try again.",
      },
    ],
    [
      "POST:/bookings/:id/cancel",
      {
        limit: 10,
        windowMs: 15 * 60_000,
        message: "Too many cancel requests. Please try again later.",
      },
    ],
    [
      "PATCH:/bookings/:id/reschedule",
      {
        limit: 10,
        windowMs: 15 * 60_000,
        message: "Too many reschedule attempts. Please try again later.",
      },
    ],
  ]);

  constructor(private readonly redisThrottleService: RedisThrottleService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      method: string;
      route?: { path?: string };
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }>();

    const routePath = request.route?.path;
    const rule = routePath ? this.rules.get(`${request.method}:${routePath}`) : undefined;
    if (!rule) {
      return true;
    }

    const ip = this.extractIp(request);
    const bucketKey = `throttle:public:${request.method}:${routePath}:${ip}`;
    const throttle = await this.redisThrottleService.consume(bucketKey, rule.limit, rule.windowMs);

    if (!throttle.allowed) {
      throw new HttpException(
        {
          message: rule.message,
          retryAfterSeconds: throttle.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private extractIp(request: {
    ip?: string;
    socket?: { remoteAddress?: string };
  }) {
    return request.ip ?? request.socket?.remoteAddress ?? "unknown";
  }
}
