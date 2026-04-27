import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { BookingEntity } from "../bookings/booking.entity";
import { RefundStatus } from "../common/enums/refund-status.enum";
import { PaymentProvider } from "../common/enums/payment-provider.enum";
import { PaymentEntity } from "./payment.entity";

@Entity({ name: "refunds" })
@Check(`"status" IN ('pending', 'processed', 'failed')`)
@Index("IDX_refunds_payment_status", ["paymentId", "status"])
export class RefundEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "payment_id", type: "uuid" })
  paymentId!: string;

  @ManyToOne(() => PaymentEntity, (payment) => payment.refunds)
  @JoinColumn({ name: "payment_id" })
  payment!: PaymentEntity;

  @Column({ name: "booking_id", type: "uuid", nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => BookingEntity, (booking) => booking.refunds, { nullable: true })
  @JoinColumn({ name: "booking_id" })
  booking!: BookingEntity | null;

  @Column({ type: "varchar", length: 32 })
  provider!: PaymentProvider;

  @Column({ name: "amount_minor", type: "integer" })
  amountMinor!: number;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "char", length: 3, default: "UAH" })
  currency!: string;

  @Column({ type: "varchar", length: 24, default: RefundStatus.Pending })
  status!: RefundStatus;

  @Column({
    name: "provider_refund_ref",
    type: "varchar",
    length: 120,
    nullable: true,
  })
  providerRefundRef!: string | null;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Column({ name: "raw_payload", type: "jsonb", nullable: true })
  rawPayload!: Record<string, unknown> | null;

  @Column({ name: "processed_at", type: "timestamp", nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
