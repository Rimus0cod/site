import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BarberEntity } from "../barbers/barber.entity";
import { BookingStatus } from "../common/enums/booking-status.enum";
import { ServiceEntity } from "../services/service.entity";

@Entity({ name: "bookings" })
@Check(`"status" IN ('pending', 'confirmed', 'canceled', 'completed')`)
@Exclusion(`USING gist ("barber_id" WITH =, tsrange("start_time", "end_time") WITH &&) WHERE ("status" <> 'canceled')`)
export class BookingEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

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

  @Column({ default: BookingStatus.Pending })
  status!: BookingStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ name: "cancellation_reason", type: "text", nullable: true })
  cancellationReason!: string | null;

  @Column({ name: "reminder_24h_sent_at", type: "timestamp", nullable: true })
  reminder24hSentAt!: Date | null;

  @Column({ name: "reminder_2h_sent_at", type: "timestamp", nullable: true })
  reminder2hSentAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
