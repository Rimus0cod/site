import { IsString, Length } from "class-validator";

export class GetPublicBookingQueryDto {
  @IsString()
  @Length(24, 128)
  token!: string;
}
