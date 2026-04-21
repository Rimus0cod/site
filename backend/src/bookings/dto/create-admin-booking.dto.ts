import { IsEnum, IsOptional } from "class-validator";
import { BookingStatus } from "../../common/enums/booking-status.enum";
import { CreateBookingDto } from "./create-booking.dto";

export class CreateAdminBookingDto extends CreateBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
