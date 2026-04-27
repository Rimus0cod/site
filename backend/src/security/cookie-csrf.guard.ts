import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { CsrfService } from "./csrf.service";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class CookieCsrfGuard implements CanActivate {
  constructor(private readonly csrfService: CsrfService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    if (!this.csrfService.hasSessionCookie(request)) {
      return true;
    }

    if (!this.csrfService.isValidDoubleSubmit(request)) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}

