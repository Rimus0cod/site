import { IsISO8601, IsOptional, IsString, IsUUID, Length, MaxLength } from "class-validator";

export class CreateBookingDto {
  @IsUUID()
  barberId!: string;

  @IsUUID()
  serviceId!: string;

  @IsString()
  @MaxLength(100)
  clientName!: string;

  @IsString()
  @Length(7, 20)
  clientPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientTelegramUsername?: string;

  @IsISO8601()
  startTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
