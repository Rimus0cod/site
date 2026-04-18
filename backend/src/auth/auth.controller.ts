import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import { Response } from "express";
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
}
