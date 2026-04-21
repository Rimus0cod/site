import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillBookingManageTokens1713811000000 implements MigrationInterface {
  name = "BackfillBookingManageTokens1713811000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "client_manage_token" = encode(gen_random_bytes(24), 'hex')
      WHERE "client_manage_token" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "client_manage_token" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "client_manage_token" DROP NOT NULL
    `);
  }
}
