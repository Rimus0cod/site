import { Injectable } from "@nestjs/common";
import { randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf.constants";

const CSRF_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class CsrfService {
  private readonly isProduction = process.env.NODE_ENV === "production";

  rotateToken(response: Response) {
    const token = this.generateToken();
    this.setTokenCookie(response, token);
    return token;
  }

  ensureToken(response: Response, currentToken?: string | null) {
    const token = currentToken?.trim() || this.generateToken();
    this.setTokenCookie(response, token);
    return token;
  }

  clearToken(response: Response) {
    response.clearCookie(CSRF_COOKIE_NAME, {
      sameSite: "strict",
      secure: this.isProduction,
      path: "/",
    });
  }

  hasSessionCookie(request: Request) {
    return Boolean(request.cookies?.access_token || request.cookies?.client_access_token);
  }

  isValidDoubleSubmit(request: Request) {
    const cookieToken = this.extractCookieToken(request);
    const headerToken = this.extractHeaderToken(request);

    if (!cookieToken || !headerToken) {
      return false;
    }

    return this.secureEquals(cookieToken, headerToken);
  }

  private setTokenCookie(response: Response, token: string) {
    response.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "strict",
      secure: this.isProduction,
      path: "/",
      maxAge: CSRF_TOKEN_MAX_AGE_MS,
    });
  }

  private generateToken() {
    return randomBytes(32).toString("hex");
  }

  private extractCookieToken(request: Request) {
    const value = request.cookies?.[CSRF_COOKIE_NAME];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private extractHeaderToken(request: Request) {
    const value = request.headers[CSRF_HEADER_NAME];

    if (Array.isArray(value)) {
      return value[0]?.trim() || null;
    }

    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private secureEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left, "utf8");
    const rightBuffer = Buffer.from(right, "utf8");

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}

