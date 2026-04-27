import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { BarberEntity } from "../barbers/barber.entity";
import { BookingEntity } from "../bookings/booking.entity";
import { ClientAccountEntity } from "../client-auth/client-account.entity";
import { BookingHoldStatus } from "../common/enums/booking-hold-status.enum";
import { PaymentProvider } from "../common/enums/payment-provider.enum";
import { PaymentEntity } from "../payments/payment.entity";
import { ServiceEntity } from "../services/service.entity";

@Entity({ name: "booking_holds" })
@Check(
  `"status" IN ('created', 'payment_pending', 'paid', 'converted', 'expired', 'released', 'failed')`,
)
@Index("IDX_booking_holds_expires_at", ["expiresAt"])
@Index("IDX_booking_holds_phone_status", ["clientPhone", "status", "expiresAt"])
@Exclusion(
  `USING gist ("barber_id" WITH =, tsrange("start_time", "end_time") WITH &&) WHERE ("status" IN ('created', 'payment_pending', 'paid'))`,
)
export class BookingHoldEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "client_account_id", type: "uuid", nullable: true })
  clientAccountId!: string | null;

  @ManyToOne(() => ClientAccountEntity, (clientAccount) => clientAccount.bookingHolds, {
    nullable: true,
  })
  @JoinColumn({ name: "client_account_id" })
  clientAccount!: ClientAccountEntity | null;

  @Column({ name: "barber_id", type: "uuid" })
  barberId!: string;

  @ManyToOne(() => BarberEntity, (barber) => barber.bookingHolds, { eager: true })
  @JoinColumn({ name: "barber_id" })
  barber!: BarberEntity;

  @Column({ name: "service_id", type: "uuid" })
  serviceId!: string;

  @ManyToOne(() => ServiceEntity, (service) => service.bookingHolds, { eager: true })
  @JoinColumn({ name: "service_id" })
  service!: ServiceEntity;

  @Column({ name: "client_name", length: 100 })
  clientName!: string;

  @Column({ name: "client_phone", length: 20 })
  clientPhone!: string;

  @Column({
    name: "client_telegram_username",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  clientTelegramUsername!: string | null;

  @Column({ name: "access_token_hash", length: 64, select: false })
  accessTokenHash!: string;

  @Column({ name: "start_time", type: "timestamp" })
  startTime!: Date;

  @Column({ name: "end_time", type: "timestamp" })
  endTime!: Date;

  @Column({ name: "price_snapshot", type: "numeric", precision: 10, scale: 2 })
  priceSnapshot!: string;

  @Column({ name: "deposit_amount", type: "numeric", precision: 10, scale: 2 })
  depositAmount!: string;

  @Column({ type: "char", length: 3, default: "UAH" })
  currency!: string;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "varchar", length: 24, default: BookingHoldStatus.Created })
  status!: BookingHoldStatus;

  @Column({ name: "payment_provider", type: "varchar", length: 32, nullable: true })
  paymentProvider!: PaymentProvider | null;

  @Column({
    name: "provider_checkout_ref",
    type: "varchar",
    length: 120,
    nullable: true,
  })
  providerCheckoutRef!: string | null;

  @Column({ name: "idempotency_key", type: "uuid" })
  idempotencyKey!: string;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt!: Date;

  @Column({ name: "converted_booking_id", type: "uuid", nullable: true, unique: true })
  convertedBookingId!: string | null;

  @OneToOne(() => BookingEntity, { nullable: true })
  @JoinColumn({ name: "converted_booking_id" })
  convertedBooking!: BookingEntity | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => PaymentEntity, (payment) => payment.bookingHold)
  payments!: PaymentEntity[];
}
