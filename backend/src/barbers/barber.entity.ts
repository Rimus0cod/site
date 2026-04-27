import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BookingHoldEntity } from "../booking-holds/booking-hold.entity";
import { BookingEntity } from "../bookings/booking.entity";
import { ScheduleExceptionEntity } from "../schedule/schedule-exception.entity";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";

@Entity({ name: "barbers" })
export class BarberEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl!: string | null;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => BookingEntity, (booking) => booking.barber)
  bookings!: BookingEntity[];

  @OneToMany(() => BookingHoldEntity, (bookingHold) => bookingHold.barber)
  bookingHolds!: BookingHoldEntity[];

  @OneToMany(() => WorkScheduleEntity, (schedule) => schedule.barber)
  schedules!: WorkScheduleEntity[];

  @OneToMany(() => ScheduleExceptionEntity, (exception) => exception.barber)
  scheduleExceptions!: ScheduleExceptionEntity[];
}
