import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CancelBookingDto {
  @IsString()
  @Length(24, 128)
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
