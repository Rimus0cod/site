import { IsEnum, IsOptional, IsString, Length } from "class-validator";
import { BookingStatus } from "../../common/enums/booking-status.enum";
import { CreateBookingDto } from "./create-booking.dto";

export class CreateAdminBookingDto extends CreateBookingDto {
  @IsString()
  @Length(7, 20)
  declare clientPhone: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
