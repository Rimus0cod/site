import { BarberEntity } from "../barbers/barber.entity";
import { BookingEntity } from "../bookings/booking.entity";
import { AdminEntity } from "../common/entities/admin.entity";
import { ScheduleExceptionEntity } from "../schedule/schedule-exception.entity";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { ServiceEntity } from "../services/service.entity";
import { TelegramProfileEntity } from "../telegram/telegram-profile.entity";

export const DATABASE_ENTITIES = [
  AdminEntity,
  BarberEntity,
  ServiceEntity,
  WorkScheduleEntity,
  ScheduleExceptionEntity,
  BookingEntity,
  TelegramProfileEntity,
];
