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
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AdminLoginThrottleGuard } from "./admin-login-throttle.guard";
import { LoginDto } from "./dto/login.dto";
import { AuthService } from "./auth.service";
import { CsrfService } from "../security/csrf.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
  ) {}

  @UseGuards(AdminLoginThrottleGuard)
  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    const isProduction = process.env.NODE_ENV === "production";

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.cookie("access_token", result.accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      path: "/api/v1",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    this.csrfService.rotateToken(response);

    return {
      admin: result.admin,
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

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(
    @Req() request: Request & { user: { id: string } },
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    this.csrfService.ensureToken(response, request.cookies?.csrf_token);
    return {
      admin: await this.authService.getAdminProfile(request.user.id),
    };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    const isProduction = process.env.NODE_ENV === "production";

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      path: "/api/v1",
    });
    this.csrfService.clearToken(response);

    return { success: true };
  }
}
