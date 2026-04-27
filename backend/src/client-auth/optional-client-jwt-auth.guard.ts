import { Injectable } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalClientJwtAuthGuard extends AuthGuard("client-jwt") {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    _info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err) {
      return null as TUser;
    }

    return (user ?? null) as TUser;
  }
}
