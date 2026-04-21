import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

interface ThrottleRule {
  limit: number;
  windowMs: number;
  message: string;
}

@Injectable()
export class PublicThrottleGuard implements CanActivate {
  private static readonly buckets = new Map<string, number[]>();

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
      "POST:/bookings",
      {
        limit: 6,
        windowMs: 15 * 60_000,
        message: "Too many booking attempts. Please try again a bit later.",
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

  canActivate(context: ExecutionContext) {
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
    const bucketKey = `${request.method}:${routePath}:${ip}`;
    const now = Date.now();
    const cutoff = now - rule.windowMs;
    const attempts = PublicThrottleGuard.buckets.get(bucketKey)?.filter((value) => value > cutoff) ?? [];

    if (attempts.length >= rule.limit) {
      throw new HttpException(rule.message, HttpStatus.TOO_MANY_REQUESTS);
    }

    attempts.push(now);
    PublicThrottleGuard.buckets.set(bucketKey, attempts);
    return true;
  }

  private extractIp(request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  }) {
    const forwardedFor = request.headers?.["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
      return forwardedFor.split(",")[0]?.trim() || "unknown";
    }

    return request.ip ?? request.socket?.remoteAddress ?? "unknown";
  }
}
