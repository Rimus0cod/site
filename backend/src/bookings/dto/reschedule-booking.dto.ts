import { Transform } from "class-transformer";
import { IsISO8601, IsString, Length, Matches } from "class-validator";

export class RescheduleBookingDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(48, 48)
  @Matches(/^[a-f0-9]{48}$/)
  token!: string;

  @IsISO8601()
  startTime!: string;
}
