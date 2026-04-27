import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { ClientAccountEntity } from "./client-account.entity";
import { ClientAuthController } from "./client-auth.controller";
import { ClientAuthService } from "./client-auth.service";
import { ClientJwtAuthGuard } from "./client-jwt-auth.guard";
import { ClientJwtStrategy } from "./client-jwt.strategy";
import { OptionalClientJwtAuthGuard } from "./optional-client-jwt-auth.guard";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([ClientAccountEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: {
          expiresIn: "30d",
        },
      }),
    }),
  ],
  controllers: [ClientAuthController],
  providers: [
    ClientAuthService,
    ClientJwtStrategy,
    ClientJwtAuthGuard,
    OptionalClientJwtAuthGuard,
    PublicThrottleGuard,
  ],
  exports: [
    ClientAuthService,
    ClientJwtAuthGuard,
    OptionalClientJwtAuthGuard,
    TypeOrmModule,
  ],
})
export class ClientAuthModule {}
