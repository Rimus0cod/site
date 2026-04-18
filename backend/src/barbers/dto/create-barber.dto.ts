import { IsBoolean, IsOptional, IsString, MaxLength, IsUrl } from "class-validator";

export class CreateBarberDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

