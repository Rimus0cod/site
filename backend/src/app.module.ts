import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import configuration, { envValidationSchema } from "./config/configuration";
import { AuthModule } from "./auth/auth.module";
import { BarbersModule } from "./barbers/barbers.module";
import { ServicesModule } from "./services/services.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { BookingsModule } from "./bookings/bookings.module";
import { TelegramModule } from "./telegram/telegram.module";
import { DATABASE_ENTITIES } from "./database/entities";
import { DATABASE_MIGRATIONS } from "./database/migrations";
import { HealthModule } from "./health/health.module";

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
        type: "postgres",
        host: configService.get<string>("database.host"),
        port: configService.get<number>("database.port"),
        username: configService.get<string>("database.user"),
        password: configService.get<string>("database.password"),
        database: configService.get<string>("database.name"),
        entities: DATABASE_ENTITIES,
        migrations: DATABASE_MIGRATIONS,
        synchronize: configService.get<boolean>("database.synchronize") ?? false,
      }),
    }),
    AuthModule,
    BarbersModule,
    ServicesModule,
    ScheduleModule,
    BookingsModule,
    TelegramModule,
    HealthModule,
  ],
})
export class AppModule {}
