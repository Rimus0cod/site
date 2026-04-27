import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientAccountsAndPhoneLimits1713813000000 implements MigrationInterface {
  name = "ClientAccountsAndPhoneLimits1713813000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "phone" character varying(20) NOT NULL,
        "name" character varying(100) NOT NULL,
        "pin_hash" character varying NOT NULL,
        "telegram_username" character varying(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_client_accounts_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_client_accounts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "client_phone" = CASE
        WHEN regexp_replace("client_phone", '\D', '', 'g') = '' THEN "client_phone"
        WHEN left(regexp_replace("client_phone", '\D', '', 'g'), 2) = '00'
          THEN '+' || substring(regexp_replace("client_phone", '\D', '', 'g') from 3)
        WHEN left(regexp_replace("client_phone", '\D', '', 'g'), 3) = '380'
          THEN '+' || regexp_replace("client_phone", '\D', '', 'g')
        WHEN left(regexp_replace("client_phone", '\D', '', 'g'), 1) = '0'
          AND length(regexp_replace("client_phone", '\D', '', 'g')) = 10
          THEN '+38' || regexp_replace("client_phone", '\D', '', 'g')
        ELSE '+' || regexp_replace("client_phone", '\D', '', 'g')
      END
      WHERE "client_phone" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookings_client_phone_active"
      ON "bookings" ("client_phone", "start_time")
      WHERE "status" IN ('pending', 'confirmed')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_client_phone_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_accounts"`);
  }
}
