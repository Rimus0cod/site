import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

export class CancelBookingDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(48, 48)
  @Matches(/^[a-f0-9]{48}$/)
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
