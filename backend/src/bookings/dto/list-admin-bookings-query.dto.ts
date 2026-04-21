import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { BookingStatus } from "../../common/enums/booking-status.enum";

export class ListAdminBookingsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsUUID()
  barberId?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
