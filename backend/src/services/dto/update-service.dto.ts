import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from "class-validator";

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  durationMin?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

