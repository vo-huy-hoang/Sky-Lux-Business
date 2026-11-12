import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstimateVersionColumn1793400000000 implements MigrationInterface {
  name = 'AddEstimateVersionColumn1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "estimates"
      ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "estimates"
      DROP COLUMN IF EXISTS "version";
    `);
  }
}

