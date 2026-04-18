import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { BookingStatus } from "../../common/enums/booking-status.enum";

export class ListAdminBookingsQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  barberId?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

