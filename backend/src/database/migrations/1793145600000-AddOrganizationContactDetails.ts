import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationContactDetails1793145600000 implements MigrationInterface {
  name = 'AddOrganizationContactDetails1793145600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
        ADD COLUMN IF NOT EXISTS "tax_code" character varying(50),
        ADD COLUMN IF NOT EXISTS "contact_email" character varying(255),
        ADD COLUMN IF NOT EXISTS "phone" character varying(30),
        ADD COLUMN IF NOT EXISTS "address" text,
        ADD COLUMN IF NOT EXISTS "industry" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
        DROP COLUMN IF EXISTS "industry",
        DROP COLUMN IF EXISTS "address",
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "contact_email",
        DROP COLUMN IF EXISTS "tax_code"
    `);
  }
}
