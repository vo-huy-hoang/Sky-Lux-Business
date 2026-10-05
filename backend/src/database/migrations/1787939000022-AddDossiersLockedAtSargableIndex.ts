import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDossiersLockedAtSargableIndex1787939000022 implements MigrationInterface {
  name = 'AddDossiersLockedAtSargableIndex1787939000022';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dossiers_financial_locked_period" ON "dossiers" ("organization_id", "locked_at") WHERE "deleted_at" IS NULL AND "locked_at" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dossiers_financial_locked_period"`,
    );
  }
}
