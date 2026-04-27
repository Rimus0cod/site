import { Transform } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

export class GetPublicBookingQueryDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(48, 48)
  @Matches(/^[a-f0-9]{48}$/)
  token!: string;
}
