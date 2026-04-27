import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { PaymentEntity } from "./payment.entity";

@Entity({ name: "payment_events" })
@Unique("UQ_payment_events_provider_event", ["provider", "providerEventId"])
@Check(`"processing_status" IN ('received', 'processed', 'ignored')`)
export class PaymentEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "payment_id", type: "uuid", nullable: true })
  paymentId!: string | null;

  @ManyToOne(() => PaymentEntity, (payment) => payment.events, { nullable: true })
  @JoinColumn({ name: "payment_id" })
  payment!: PaymentEntity | null;

  @Column({ type: "varchar", length: 32 })
  provider!: string;

  @Column({ name: "provider_event_id", type: "varchar", length: 120 })
  providerEventId!: string;

  @Column({ name: "event_type", type: "varchar", length: 64 })
  eventType!: string;

  @Column({ name: "raw_payload", type: "jsonb" })
  rawPayload!: Record<string, unknown>;

  @Column({ name: "processing_status", type: "varchar", length: 24, default: "received" })
  processingStatus!: string;

  @Column({ name: "processed_at", type: "timestamp", nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
