import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface ClientSessionUser {
  id: string;
  phone: string;
  name: string;
  telegramUsername?: string | null;
}

function extractClientToken(request: { cookies?: Record<string, string> }) {
  return request?.cookies?.client_access_token ?? null;
}

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(Strategy, "client-jwt") {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractClientToken]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("jwt.secret"),
    });
  }

  validate(payload: {
    sub: string;
    scope?: string;
    phone: string;
    name: string;
    telegramUsername?: string | null;
  }) {
    if (payload.scope !== "client") {
      throw new UnauthorizedException("Invalid client session");
    }

    return {
      id: payload.sub,
      phone: payload.phone,
      name: payload.name,
      telegramUsername: payload.telegramUsername ?? null,
    };
  }
}
