import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BookingHoldsModule } from "./booking-holds/booking-holds.module";
import { BookingsModule } from "./bookings/bookings.module";
import configuration, { envValidationSchema } from "./config/configuration";
import { DATABASE_ENTITIES } from "./database/entities";
import { DATABASE_MIGRATIONS } from "./database/migrations";
import { createTypeOrmOptions } from "./database/typeorm-options";
import { PaymentsModule } from "./payments/payments.module";
import { RedisModule } from "./redis/redis.module";
import { TelegramModule } from "./telegram/telegram.module";
import { WorkerModule } from "./worker.module";

@Module({
  imports: [
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
    BookingsModule,
    BookingHoldsModule,
    PaymentsModule,
    TelegramModule,
    WorkerModule,
  ],
})
export class WorkerAppModule {}
