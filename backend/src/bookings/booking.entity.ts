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
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BarberEntity } from "../barbers/barber.entity";
import { ClientAccountEntity } from "../client-auth/client-account.entity";
import { BookingPaymentStatus } from "../common/enums/booking-payment-status.enum";
import { BookingStatus } from "../common/enums/booking-status.enum";
import { BookingSource } from "../common/enums/booking-source.enum";
import { PaymentEntity } from "../payments/payment.entity";
import { RefundEntity } from "../payments/refund.entity";
import { ServiceEntity } from "../services/service.entity";

@Entity({ name: "bookings" })
@Check(`"status" IN ('pending', 'confirmed', 'canceled', 'completed')`)
@Exclusion(`USING gist ("barber_id" WITH =, tsrange("start_time", "end_time") WITH &&) WHERE ("status" <> 'canceled')`)
@Index("IDX_bookings_client_account_status", ["clientAccountId", "status", "startTime"])
@Index("IDX_bookings_phone_status", ["clientPhone", "status", "startTime"])
export class BookingEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "booking_hold_id", type: "uuid", nullable: true, unique: true })
  bookingHoldId!: string | null;

  @OneToOne(() => BookingHoldEntity, { nullable: true })
  @JoinColumn({ name: "booking_hold_id" })
  bookingHold!: BookingHoldEntity | null;

  @Column({ name: "client_account_id", type: "uuid", nullable: true })
  clientAccountId!: string | null;

  @ManyToOne(() => ClientAccountEntity, (clientAccount) => clientAccount.bookings, {
    nullable: true,
  })
  @JoinColumn({ name: "client_account_id" })
  clientAccount!: ClientAccountEntity | null;

  @Column({ name: "barber_id", type: "uuid" })
  barberId!: string;

  @ManyToOne(() => BarberEntity, (barber) => barber.bookings, { eager: true })
  @JoinColumn({ name: "barber_id" })
  barber!: BarberEntity;

  @Column({ name: "service_id", type: "uuid" })
  serviceId!: string;

  @ManyToOne(() => ServiceEntity, (service) => service.bookings, { eager: true })
  @JoinColumn({ name: "service_id" })
  service!: ServiceEntity;

  @Column({ name: "client_name", length: 100 })
  clientName!: string;

  @Column({ name: "client_phone", length: 20 })
  clientPhone!: string;

  @Column({ type: "varchar", length: 16, default: BookingSource.Site })
  source!: BookingSource;

  @Column({
    name: "client_telegram_username",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  clientTelegramUsername!: string | null;

  @Column({
    name: "client_manage_token",
    length: 64,
    unique: true,
    select: false,
  })
  clientManageToken!: string;

  @Column({ name: "start_time", type: "timestamp" })
  startTime!: Date;

  @Column({ name: "end_time", type: "timestamp" })
  endTime!: Date;

  @Column({ name: "price_snapshot", type: "numeric", precision: 10, scale: 2 })
  priceSnapshot!: string;

  @Column({ name: "deposit_amount", type: "numeric", precision: 10, scale: 2, default: 0 })
  depositAmount!: string;

  @Column({ type: "char", length: 3, default: "UAH" })
  currency!: string;

  @Column({
    name: "payment_status",
    type: "varchar",
    length: 24,
    default: BookingPaymentStatus.Unpaid,
  })
  paymentStatus!: BookingPaymentStatus;

  @Column({ default: BookingStatus.Pending })
  status!: BookingStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ name: "cancellation_reason", type: "text", nullable: true })
  cancellationReason!: string | null;

  @Column({ name: "canceled_at", type: "timestamp", nullable: true })
  canceledAt!: Date | null;

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt!: Date | null;

  @Column({ name: "reminder_24h_sent_at", type: "timestamp", nullable: true })
  reminder24hSentAt!: Date | null;

  @Column({ name: "reminder_2h_sent_at", type: "timestamp", nullable: true })
  reminder2hSentAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => PaymentEntity, (payment) => payment.booking)
  payments!: PaymentEntity[];

  @OneToMany(() => RefundEntity, (refund) => refund.booking)
  refunds!: RefundEntity[];
}
