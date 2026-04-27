import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminAuditLogs1713816000000 implements MigrationInterface {
  name = "AdminAuditLogs1713816000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_id" uuid,
        "admin_email" character varying(255) NOT NULL,
        "action" character varying(64) NOT NULL,
        "resource" character varying(64) NOT NULL,
        "resource_id" uuid,
        "summary" text NOT NULL,
        "request_id" character varying(128),
        "ip" character varying(64),
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_admin_audit_logs_admin'
        ) THEN
          ALTER TABLE "admin_audit_logs"
          ADD CONSTRAINT "FK_admin_audit_logs_admin"
          FOREIGN KEY ("admin_id") REFERENCES "admins"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_created_at"
      ON "admin_audit_logs" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_admin_created_at"
      ON "admin_audit_logs" ("admin_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_resource_created_at"
      ON "admin_audit_logs" ("resource", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_admin_audit_logs_resource_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_admin_audit_logs_admin_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_admin_audit_logs_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audit_logs"`);
  }
}

