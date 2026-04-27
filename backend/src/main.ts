import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response, json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { MonitoringService } from "./monitoring/monitoring.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const expressApp = app.getHttpAdapter().getInstance();
  type RawBodyRequest = Request & { rawBody?: Buffer; requestId?: string };
  const monitoringService = app.get(MonitoringService);
  const shouldCaptureRawBody = (request: Request) =>
    request.originalUrl.startsWith("/api/v1/payments/webhooks/stripe");
  expressApp.set("trust proxy", 1);
  expressApp.disable("x-powered-by");
  expressApp.disable("etag");
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const allowedOrigins = new Set([
    frontendUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.use(
    json({
      limit: "10kb",
      verify: (request, _response, buffer) => {
        if (buffer.length > 0 && shouldCaptureRawBody(request as Request)) {
          (request as RawBodyRequest).rawBody = Buffer.from(buffer);
        }
      },
    }),
  );
  app.use(
    urlencoded({
      extended: true,
      limit: "10kb",
      verify: (request, _response, buffer) => {
        if (buffer.length > 0 && shouldCaptureRawBody(request as Request)) {
          (request as RawBodyRequest).rawBody = Buffer.from(buffer);
        }
      },
    }),
  );
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestIdHeader = request.headers["x-request-id"];
    const requestId =
      typeof requestIdHeader === "string" && requestIdHeader.trim().length > 0
        ? requestIdHeader.trim()
        : randomUUID();
    const startedAt = Date.now();

    (request as RawBodyRequest).requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    response.on("finish", () => {
      const routeLabel =
        request.route?.path ??
        (request.baseUrl && request.path ? `${request.baseUrl}${request.path}` : request.path || "unmatched");

      monitoringService.recordHttpRequest({
        method: request.method,
        route: routeLabel,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });

      const entry = {
        timestamp: new Date().toISOString(),
        level: "info",
        requestId,
        method: request.method,
        path: request.originalUrl,
        route: routeLabel,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
        ip: request.ip,
      };

      console.log(JSON.stringify(entry));
    });

    next();
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");

    if (
      request.path.startsWith("/api/v1/auth") ||
      request.path.startsWith("/api/v1/client-auth") ||
      request.path.startsWith("/api/v1/admin") ||
      request.path.startsWith("/api/v1/booking-holds") ||
      request.path.startsWith("/api/v1/payments") ||
      request.path === "/api/v1/bookings" ||
      request.path.startsWith("/api/v1/bookings/")
    ) {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Pragma", "no-cache");
    }

    if (process.env.NODE_ENV === "production") {
      response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
  });
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-CSRF-Token"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === "production",
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

bootstrap();
