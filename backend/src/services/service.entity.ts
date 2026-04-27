import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BookingEntity } from "../bookings/booking.entity";
import { PaymentPolicy } from "../common/enums/payment-policy.enum";

@Entity({ name: "services" })
export class ServiceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  price!: string;

  @Column({ name: "duration_min", type: "integer" })
  durationMin!: number;

  @Column({
    name: "payment_policy",
    type: "varchar",
    length: 24,
    default: PaymentPolicy.DepositPercent,
  })
  paymentPolicy!: PaymentPolicy;

  @Column({
    name: "deposit_value",
    type: "numeric",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  depositValue!: string | null;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => BookingEntity, (booking) => booking.service)
  bookings!: BookingEntity[];

  @OneToMany(() => BookingHoldEntity, (bookingHold) => bookingHold.service)
  bookingHolds!: BookingHoldEntity[];
}
