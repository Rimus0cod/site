import { MigrationInterface, QueryRunner } from "typeorm";

export class HashBookingManageTokens1713812000000 implements MigrationInterface {
  name = "HashBookingManageTokens1713812000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "client_manage_token" = encode(digest("client_manage_token", 'sha256'), 'hex')
      WHERE "client_manage_token" IS NOT NULL
        AND length("client_manage_token") = 48
    `);
  }

  public async down(): Promise<void> {}
}
