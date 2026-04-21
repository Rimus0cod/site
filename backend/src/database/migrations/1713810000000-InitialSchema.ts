import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1713810000000 implements MigrationInterface {
  name = "InitialSchema1713810000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admins" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'admin',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_admins_email" UNIQUE ("email"),
        CONSTRAINT "PK_admins_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "barbers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "photo_url" text,
        "bio" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_barbers_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "price" numeric(10,2) NOT NULL,
        "duration_min" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_services_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_schedules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "barber_id" uuid NOT NULL,
        "day_of_week" smallint NOT NULL,
        "start_time" time,
        "end_time" time,
        "is_day_off" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_work_schedules_barber_day" UNIQUE ("barber_id", "day_of_week"),
        CONSTRAINT "CHK_work_schedules_day" CHECK ("day_of_week" BETWEEN 0 AND 6),
        CONSTRAINT "PK_work_schedules_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_exceptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "barber_id" uuid NOT NULL,
        "date" date NOT NULL,
        "start_time" time,
        "end_time" time,
        "is_day_off" boolean NOT NULL DEFAULT false,
        "note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_schedule_exceptions_barber_date" UNIQUE ("barber_id", "date"),
        CONSTRAINT "PK_schedule_exceptions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "barber_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "client_name" character varying(100) NOT NULL,
        "client_phone" character varying(20) NOT NULL,
        "client_telegram_username" character varying(64),
        "client_manage_token" character varying(64),
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "notes" text,
        "cancellation_reason" text,
        "reminder_24h_sent_at" TIMESTAMP,
        "reminder_2h_sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "username" character varying(64) NOT NULL,
        "chat_id" bigint NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_telegram_profiles_username" UNIQUE ("username"),
        CONSTRAINT "PK_telegram_profiles_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "barbers"
      ADD COLUMN IF NOT EXISTS "photo_url" text,
      ADD COLUMN IF NOT EXISTS "bio" text,
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "services"
      ADD COLUMN IF NOT EXISTS "description" text,
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "work_schedules"
      ADD COLUMN IF NOT EXISTS "is_day_off" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "schedule_exceptions"
      ADD COLUMN IF NOT EXISTS "start_time" time,
      ADD COLUMN IF NOT EXISTS "end_time" time,
      ADD COLUMN IF NOT EXISTS "is_day_off" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "note" text,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "client_telegram_username" character varying(64),
      ADD COLUMN IF NOT EXISTS "client_manage_token" character varying(64),
      ADD COLUMN IF NOT EXISTS "cancellation_reason" text,
      ADD COLUMN IF NOT EXISTS "reminder_24h_sent_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "reminder_2h_sent_at" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "telegram_profiles"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_work_schedules_barber'
        ) THEN
          ALTER TABLE "work_schedules"
          ADD CONSTRAINT "FK_work_schedules_barber"
          FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_schedule_exceptions_barber'
        ) THEN
          ALTER TABLE "schedule_exceptions"
          ADD CONSTRAINT "FK_schedule_exceptions_barber"
          FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_bookings_barber'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "FK_bookings_barber"
          FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_bookings_service'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "FK_bookings_service"
          FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_bookings_status'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "CHK_bookings_status"
          CHECK ("status" IN ('pending', 'confirmed', 'canceled', 'completed'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'EX_bookings_barber_times'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "EX_bookings_barber_times"
          EXCLUDE USING gist ("barber_id" WITH =, tsrange("start_time", "end_time") WITH &&)
          WHERE ("status" <> 'canceled');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bookings_manage_token" ON "bookings" ("client_manage_token")
      WHERE "client_manage_token" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookings_barber_date" ON "bookings" ("barber_id", "start_time")
      WHERE "status" <> 'canceled'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookings_reminders" ON "bookings" ("status", "start_time")
      WHERE "status" IN ('pending', 'confirmed')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_profiles"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_reminders"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_barber_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_manage_token"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'EX_bookings_barber_times'
        ) THEN
          ALTER TABLE "bookings" DROP CONSTRAINT "EX_bookings_barber_times";
        END IF;
      END $$;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_exceptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "barbers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins"`);
  }
}
