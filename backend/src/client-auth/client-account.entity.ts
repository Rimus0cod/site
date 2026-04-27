import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BookingEntity } from "../bookings/booking.entity";

@Entity({ name: "client_accounts" })
@Unique(["phone"])
export class ClientAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: "pin_hash" })
  pinHash!: string;

  @Column({
    name: "telegram_username",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  telegramUsername!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => BookingEntity, (booking) => booking.clientAccount)
  bookings!: BookingEntity[];

  @OneToMany(() => BookingHoldEntity, (bookingHold) => bookingHold.clientAccount)
  bookingHolds!: BookingHoldEntity[];
}
