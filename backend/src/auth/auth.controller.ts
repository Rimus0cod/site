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
import { Response } from "express";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    const isProduction = process.env.NODE_ENV === "production";

    response.cookie("access_token", result.accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() request: { user: { id: string } }) {
    return {
      admin: await this.authService.getAdminProfile(request.user.id),
    };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    const isProduction = process.env.NODE_ENV === "production";

    response.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
    });

    return { success: true };
  }
}
