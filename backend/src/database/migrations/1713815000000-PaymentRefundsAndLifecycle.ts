import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentRefundsAndLifecycle1713815000000 implements MigrationInterface {
  name = "PaymentRefundsAndLifecycle1713815000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refunds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "payment_id" uuid NOT NULL,
        "booking_id" uuid,
        "provider" character varying(32) NOT NULL,
        "amount_minor" integer NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'UAH',
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "provider_refund_ref" character varying(120),
        "reason" text,
        "raw_payload" jsonb,
        "processed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refunds_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_refunds_status'
        ) THEN
          ALTER TABLE "refunds"
          ADD CONSTRAINT "CHK_refunds_status"
          CHECK ("status" IN ('pending', 'processed', 'failed'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_refunds_payment'
        ) THEN
          ALTER TABLE "refunds"
          ADD CONSTRAINT "FK_refunds_payment"
          FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_refunds_booking'
        ) THEN
          ALTER TABLE "refunds"
          ADD CONSTRAINT "FK_refunds_booking"
          FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refunds_payment_status"
      ON "refunds" ("payment_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_refunds_payment_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refunds"`);
  }
}
