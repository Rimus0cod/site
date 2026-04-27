import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "admin_audit_logs" })
@Index("IDX_admin_audit_logs_created_at", ["createdAt"])
@Index("IDX_admin_audit_logs_admin_created_at", ["adminId", "createdAt"])
@Index("IDX_admin_audit_logs_resource_created_at", ["resource", "createdAt"])
export class AdminAuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "admin_id", type: "uuid", nullable: true })
  adminId!: string | null;

  @Column({ name: "admin_email", type: "varchar", length: 255 })
  adminEmail!: string;

  @Column({ type: "varchar", length: 64 })
  action!: string;

  @Column({ type: "varchar", length: 64 })
  resource!: string;

  @Column({ name: "resource_id", type: "uuid", nullable: true })
  resourceId!: string | null;

  @Column({ type: "text" })
  summary!: string;

  @Column({ name: "request_id", type: "varchar", length: 128, nullable: true })
  requestId!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
