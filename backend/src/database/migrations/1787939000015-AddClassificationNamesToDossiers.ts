import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassificationNamesToDossiers1787939000015 implements MigrationInterface {
  name = 'AddClassificationNamesToDossiers1787939000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dossiers"
      ADD COLUMN IF NOT EXISTS "business_line_name" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "market_type_name" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dossiers"
      DROP COLUMN IF EXISTS "market_type_name",
      DROP COLUMN IF EXISTS "business_line_name"
    `);
  }
}
