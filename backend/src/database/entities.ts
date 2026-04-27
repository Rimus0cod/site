import { AdminAuditLogEntity } from "../admin-audit/admin-audit-log.entity";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BarberEntity } from "../barbers/barber.entity";
import { BookingEntity } from "../bookings/booking.entity";
import { ClientAccountEntity } from "../client-auth/client-account.entity";
import { AdminEntity } from "../common/entities/admin.entity";
import { PaymentEventEntity } from "../payments/payment-event.entity";
import { PaymentEntity } from "../payments/payment.entity";
import { RefundEntity } from "../payments/refund.entity";
import { ScheduleExceptionEntity } from "../schedule/schedule-exception.entity";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { ServiceEntity } from "../services/service.entity";
import { TelegramProfileEntity } from "../telegram/telegram-profile.entity";

export const DATABASE_ENTITIES = [
  AdminAuditLogEntity,
  AdminEntity,
  ClientAccountEntity,
  BarberEntity,
  ServiceEntity,
  BookingHoldEntity,
  PaymentEntity,
  PaymentEventEntity,
  RefundEntity,
  WorkScheduleEntity,
  ScheduleExceptionEntity,
  BookingEntity,
  TelegramProfileEntity,
];
