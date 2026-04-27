import { Transform } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

export class LoginClientDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(7, 20)
  phone!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(4, 8)
  @Matches(/^\d{4,8}$/)
  pin!: string;
}
