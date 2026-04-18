import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { BarberEntity } from "../barbers/barber.entity";

@Entity({ name: "work_schedules" })
@Unique(["barberId", "dayOfWeek"])
@Check(`"day_of_week" BETWEEN 0 AND 6`)
export class WorkScheduleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "barber_id", type: "uuid" })
  barberId!: string;

  @ManyToOne(() => BarberEntity, (barber) => barber.schedules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "barber_id" })
  barber!: BarberEntity;

  @Column({ name: "day_of_week", type: "smallint" })
  dayOfWeek!: number;

  @Column({ name: "start_time", type: "time", nullable: true })
  startTime!: string | null;

  @Column({ name: "end_time", type: "time", nullable: true })
  endTime!: string | null;

  @Column({ name: "is_day_off", default: false })
  isDayOff!: boolean;
}

