import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BookingEntity } from "../bookings/booking.entity";
import { PaymentProvider } from "../common/enums/payment-provider.enum";
import { PaymentStatus } from "../common/enums/payment-status.enum";
import { PaymentEventEntity } from "./payment-event.entity";
import { RefundEntity } from "./refund.entity";

@Entity({ name: "payments" })
@Check(`"status" IN ('pending', 'paid', 'failed', 'refunded', 'partial_refund')`)
@Index("IDX_payments_hold_status", ["bookingHoldId", "status"])
export class PaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "booking_hold_id", type: "uuid" })
  bookingHoldId!: string;

  @ManyToOne(() => BookingHoldEntity, (bookingHold) => bookingHold.payments)
  @JoinColumn({ name: "booking_hold_id" })
  bookingHold!: BookingHoldEntity;

  @Column({ name: "booking_id", type: "uuid", nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => BookingEntity, (booking) => booking.payments, { nullable: true })
  @JoinColumn({ name: "booking_id" })
  booking!: BookingEntity | null;

  @Column({ type: "varchar", length: 32 })
  provider!: PaymentProvider;

  @Column({ type: "varchar", length: 24, default: "deposit" })
  kind!: string;

  @Column({ name: "amount_minor", type: "integer" })
  amountMinor!: number;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "char", length: 3, default: "UAH" })
  currency!: string;

  @Column({ type: "varchar", length: 24, default: PaymentStatus.Pending })
  status!: PaymentStatus;

  @Column({ name: "provider_checkout_ref", type: "varchar", length: 120, unique: true })
  providerCheckoutRef!: string;

  @Column({
    name: "provider_payment_ref",
    type: "varchar",
    length: 120,
    nullable: true,
  })
  providerPaymentRef!: string | null;

  @Column({ name: "idempotency_key", type: "uuid" })
  idempotencyKey!: string;

  @Column({ name: "paid_at", type: "timestamp", nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => PaymentEventEntity, (paymentEvent) => paymentEvent.payment)
  events!: PaymentEventEntity[];

  @OneToMany(() => RefundEntity, (refund) => refund.payment)
  refunds!: RefundEntity[];
}
