import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { BarberEntity } from "../barbers/barber.entity";

@Entity({ name: "schedule_exceptions" })
@Unique(["barberId", "date"])
export class ScheduleExceptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "barber_id", type: "uuid" })
  barberId!: string;

  @ManyToOne(() => BarberEntity, (barber) => barber.scheduleExceptions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "barber_id" })
  barber!: BarberEntity;

  @Column({ type: "date" })
  date!: string;

  @Column({ name: "start_time", type: "time", nullable: true })
  startTime!: string | null;

  @Column({ name: "end_time", type: "time", nullable: true })
  endTime!: string | null;

  @Column({ name: "is_day_off", default: false })
  isDayOff!: boolean;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
