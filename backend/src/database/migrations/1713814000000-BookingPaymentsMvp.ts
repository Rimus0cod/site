import { MigrationInterface, QueryRunner } from "typeorm";

export class BookingPaymentsMvp1713814000000 implements MigrationInterface {
  name = "BookingPaymentsMvp1713814000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "services"
      ADD COLUMN IF NOT EXISTS "payment_policy" character varying(24) NOT NULL DEFAULT 'deposit_percent',
      ADD COLUMN IF NOT EXISTS "deposit_value" numeric(10,2)
    `);

    await queryRunner.query(`
      UPDATE "services"
      SET "deposit_value" = 30.00
      WHERE "payment_policy" = 'deposit_percent'
        AND "deposit_value" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_services_payment_policy'
        ) THEN
          ALTER TABLE "services"
          ADD CONSTRAINT "CHK_services_payment_policy"
          CHECK ("payment_policy" IN ('offline', 'deposit_fixed', 'deposit_percent', 'full_prepayment'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_holds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_account_id" uuid,
        "barber_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "client_name" character varying(100) NOT NULL,
        "client_phone" character varying(20) NOT NULL,
        "client_telegram_username" character varying(64),
        "access_token_hash" character varying(64) NOT NULL,
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "price_snapshot" numeric(10,2) NOT NULL,
        "deposit_amount" numeric(10,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'UAH',
        "notes" text,
        "status" character varying(24) NOT NULL DEFAULT 'created',
        "payment_provider" character varying(32),
        "provider_checkout_ref" character varying(120),
        "idempotency_key" uuid NOT NULL DEFAULT gen_random_uuid(),
        "expires_at" TIMESTAMP NOT NULL,
        "converted_booking_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_holds_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_booking_holds_converted_booking_id" UNIQUE ("converted_booking_id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_booking_holds_status'
        ) THEN
          ALTER TABLE "booking_holds"
          ADD CONSTRAINT "CHK_booking_holds_status"
          CHECK ("status" IN ('created', 'payment_pending', 'paid', 'converted', 'expired', 'released', 'failed'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_booking_holds_client_account'
        ) THEN
          ALTER TABLE "booking_holds"
          ADD CONSTRAINT "FK_booking_holds_client_account"
          FOREIGN KEY ("client_account_id") REFERENCES "client_accounts"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_booking_holds_barber'
        ) THEN
          ALTER TABLE "booking_holds"
          ADD CONSTRAINT "FK_booking_holds_barber"
          FOREIGN KEY ("barber_id") REFERENCES "barbers"("id")
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
          WHERE conname = 'FK_booking_holds_service'
        ) THEN
          ALTER TABLE "booking_holds"
          ADD CONSTRAINT "FK_booking_holds_service"
          FOREIGN KEY ("service_id") REFERENCES "services"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_booking_holds_converted_booking'
        ) THEN
          ALTER TABLE "booking_holds"
          ADD CONSTRAINT "FK_booking_holds_converted_booking"
          FOREIGN KEY ("converted_booking_id") REFERENCES "bookings"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'EX_booking_holds_barber_times'
        ) THEN
          ALTER TABLE "booking_holds"
          ADD CONSTRAINT "EX_booking_holds_barber_times"
          EXCLUDE USING gist ("barber_id" WITH =, tsrange("start_time", "end_time") WITH &&)
          WHERE ("status" IN ('created', 'payment_pending', 'paid'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_booking_holds_expires_at" ON "booking_holds" ("expires_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_booking_holds_phone_status"
      ON "booking_holds" ("client_phone", "status", "expires_at")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_booking_holds_provider_checkout_ref"
      ON "booking_holds" ("provider_checkout_ref")
      WHERE "provider_checkout_ref" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "booking_hold_id" uuid,
      ADD COLUMN IF NOT EXISTS "client_account_id" uuid,
      ADD COLUMN IF NOT EXISTS "source" character varying(16) NOT NULL DEFAULT 'site',
      ADD COLUMN IF NOT EXISTS "price_snapshot" numeric(10,2),
      ADD COLUMN IF NOT EXISTS "deposit_amount" numeric(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "currency" character(3) NOT NULL DEFAULT 'UAH',
      ADD COLUMN IF NOT EXISTS "payment_status" character varying(24) NOT NULL DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      UPDATE "bookings" AS "booking"
      SET "price_snapshot" = "service"."price"
      FROM "services" AS "service"
      WHERE "booking"."service_id" = "service"."id"
        AND "booking"."price_snapshot" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "price_snapshot" = 0
      WHERE "price_snapshot" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_bookings_source'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "CHK_bookings_source"
          CHECK ("source" IN ('site', 'admin', 'telegram'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_bookings_payment_status'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "CHK_bookings_payment_status"
          CHECK ("payment_status" IN ('unpaid', 'partially_paid', 'paid', 'refunded', 'partial_refund'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_bookings_client_account'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "FK_bookings_client_account"
          FOREIGN KEY ("client_account_id") REFERENCES "client_accounts"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_bookings_booking_hold'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "FK_bookings_booking_hold"
          FOREIGN KEY ("booking_hold_id") REFERENCES "booking_holds"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bookings_booking_hold_id"
      ON "bookings" ("booking_hold_id")
      WHERE "booking_hold_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookings_client_account_status"
      ON "bookings" ("client_account_id", "status", "start_time")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookings_phone_status"
      ON "bookings" ("client_phone", "status", "start_time")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_hold_id" uuid NOT NULL,
        "booking_id" uuid,
        "provider" character varying(32) NOT NULL,
        "kind" character varying(24) NOT NULL DEFAULT 'deposit',
        "amount_minor" integer NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'UAH',
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "provider_checkout_ref" character varying(120) NOT NULL,
        "provider_payment_ref" character varying(120),
        "idempotency_key" uuid NOT NULL DEFAULT gen_random_uuid(),
        "paid_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_provider_checkout_ref" UNIQUE ("provider_checkout_ref")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_payments_status'
        ) THEN
          ALTER TABLE "payments"
          ADD CONSTRAINT "CHK_payments_status"
          CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded', 'partial_refund'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_payments_booking_hold'
        ) THEN
          ALTER TABLE "payments"
          ADD CONSTRAINT "FK_payments_booking_hold"
          FOREIGN KEY ("booking_hold_id") REFERENCES "booking_holds"("id")
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
          WHERE conname = 'FK_payments_booking'
        ) THEN
          ALTER TABLE "payments"
          ADD CONSTRAINT "FK_payments_booking"
          FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_hold_status" ON "payments" ("booking_hold_id", "status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payments_provider_payment_ref"
      ON "payments" ("provider_payment_ref")
      WHERE "provider_payment_ref" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "payment_id" uuid,
        "provider" character varying(32) NOT NULL,
        "provider_event_id" character varying(120) NOT NULL,
        "event_type" character varying(64) NOT NULL,
        "raw_payload" jsonb NOT NULL,
        "processing_status" character varying(24) NOT NULL DEFAULT 'received',
        "processed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_events_provider_event" UNIQUE ("provider", "provider_event_id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_payment_events_processing_status'
        ) THEN
          ALTER TABLE "payment_events"
          ADD CONSTRAINT "CHK_payment_events_processing_status"
          CHECK ("processing_status" IN ('received', 'processed', 'ignored'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_payment_events_payment'
        ) THEN
          ALTER TABLE "payment_events"
          ADD CONSTRAINT "FK_payment_events_payment"
          FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_events"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_payments_provider_payment_ref"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_payments_hold_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_phone_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_client_account_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_booking_hold_id"`);
    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP COLUMN IF EXISTS "updated_at",
      DROP COLUMN IF EXISTS "completed_at",
      DROP COLUMN IF EXISTS "canceled_at",
      DROP COLUMN IF EXISTS "payment_status",
      DROP COLUMN IF EXISTS "currency",
      DROP COLUMN IF EXISTS "deposit_amount",
      DROP COLUMN IF EXISTS "price_snapshot",
      DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "client_account_id",
      DROP COLUMN IF EXISTS "booking_hold_id"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_booking_holds_provider_checkout_ref"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_booking_holds_phone_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_booking_holds_expires_at"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'EX_booking_holds_barber_times'
        ) THEN
          ALTER TABLE "booking_holds" DROP CONSTRAINT "EX_booking_holds_barber_times";
        END IF;
      END $$;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_holds"`);
    await queryRunner.query(`
      ALTER TABLE "services"
      DROP COLUMN IF EXISTS "deposit_value",
      DROP COLUMN IF EXISTS "payment_policy"
    `);
  }
}
