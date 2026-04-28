import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { StringValue } from "ms";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminEntity } from "../common/entities/admin.entity";
import { AdminBootstrapService } from "./admin-bootstrap.service";
import { AdminLoginThrottleGuard } from "./admin-login-throttle.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([AdminEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("jwt.secret"),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>("jwt.expiresIn"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminLoginThrottleGuard, AdminBootstrapService],
  exports: [AuthService],
})
export class AuthModule {}
