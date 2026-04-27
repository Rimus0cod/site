import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminAuditLogModule } from "./admin-audit/admin-audit-log.module";
import { BookingHoldsModule } from "./booking-holds/booking-holds.module";
import configuration, { envValidationSchema } from "./config/configuration";
import { AuthModule } from "./auth/auth.module";
import { BarbersModule } from "./barbers/barbers.module";
import { ClientAuthModule } from "./client-auth/client-auth.module";
import { ServicesModule } from "./services/services.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { BookingsModule } from "./bookings/bookings.module";
import { TelegramModule } from "./telegram/telegram.module";
import { DATABASE_ENTITIES } from "./database/entities";
import { DATABASE_MIGRATIONS } from "./database/migrations";
import { createTypeOrmOptions } from "./database/typeorm-options";
import { HealthModule } from "./health/health.module";
import { MonitoringModule } from "./monitoring/monitoring.module";
import { PaymentsModule } from "./payments/payments.module";
import { RedisModule } from "./redis/redis.module";
import { CookieCsrfGuard } from "./security/cookie-csrf.guard";
import { SecurityModule } from "./security/security.module";

@Module({
  imports: [
    AdminAuditLogModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      envFilePath: [".env"],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createTypeOrmOptions(configService),
        entities: DATABASE_ENTITIES,
        migrations: DATABASE_MIGRATIONS,
      }),
    }),
    RedisModule,
    SecurityModule,
    MonitoringModule,
    AuthModule,
    ClientAuthModule,
    BarbersModule,
    ServicesModule,
    ScheduleModule,
    BookingsModule,
    BookingHoldsModule,
    PaymentsModule,
    TelegramModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CookieCsrfGuard,
    },
  ],
})
export class AppModule {}
