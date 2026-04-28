import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

function extractToken(request: { cookies?: Record<string, string> }) {
  return request?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractToken, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("jwt.secret"),
    });
  }

  validate(payload: { sub: string; role: string; email: string }) {
    return {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
  }
}
