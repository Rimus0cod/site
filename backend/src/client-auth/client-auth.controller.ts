import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { PublicThrottleGuard } from "../common/guards/public-throttle.guard";
import { CsrfService } from "../security/csrf.service";
import { ClientAuthService } from "./client-auth.service";
import { OptionalClientJwtAuthGuard } from "./optional-client-jwt-auth.guard";
import { LoginClientDto } from "./dto/login-client.dto";
import { RegisterClientDto } from "./dto/register-client.dto";

@Controller("client-auth")
export class ClientAuthController {
  constructor(
    private readonly clientAuthService: ClientAuthService,
    private readonly csrfService: CsrfService,
  ) {}

  @UseGuards(PublicThrottleGuard)
  @Post("register")
  @HttpCode(200)
  async register(@Body() dto: RegisterClientDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.clientAuthService.register(dto);
    this.setSessionCookie(response, result.accessToken);
    this.csrfService.rotateToken(response);

    return {
      client: result.client,
    };
  }

  @Get("csrf")
  csrf(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");

    return {
      csrfToken: this.csrfService.ensureToken(response, request.cookies?.csrf_token),
    };
  }

  @UseGuards(PublicThrottleGuard)
  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginClientDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.clientAuthService.login(dto);
    this.setSessionCookie(response, result.accessToken);
    this.csrfService.rotateToken(response);

    return {
      client: result.client,
    };
  }

  @UseGuards(OptionalClientJwtAuthGuard)
  @Get("me")
  async me(
    @Req() request: Request & { user?: { id: string } | null },
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");

    if (!request.user?.id) {
      this.csrfService.clearToken(response);
      return {
        client: null,
      };
    }

    this.csrfService.ensureToken(response, request.cookies?.csrf_token);
    return {
      client: await this.clientAuthService.getClientProfile(request.user.id),
    };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    const isProduction = process.env.NODE_ENV === "production";

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.clearCookie("client_access_token", {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      path: "/api/v1",
    });
    this.csrfService.clearToken(response);

    return { success: true };
  }

  private setSessionCookie(response: Response, accessToken: string) {
    const isProduction = process.env.NODE_ENV === "production";

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.cookie("client_access_token", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      path: "/api/v1",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
