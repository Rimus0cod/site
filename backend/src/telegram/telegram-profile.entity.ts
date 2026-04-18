import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "telegram_profiles" })
@Unique(["username"])
export class TelegramProfileEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 64 })
  username!: string;

  @Column({ name: "chat_id", type: "bigint" })
  chatId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

