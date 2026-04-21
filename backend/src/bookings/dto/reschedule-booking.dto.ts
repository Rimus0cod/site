import { IsISO8601, IsString, Length } from "class-validator";

export class RescheduleBookingDto {
  @IsString()
  @Length(24, 128)
  token!: string;

  @IsISO8601()
  startTime!: string;
}
