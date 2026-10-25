import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportIndexes1787939000004 implements MigrationInterface {
  name = 'AddReportIndexes1787939000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_estimates_report_lookup" ON "estimates" ("organization_id", "dossier_id", "status", "version_no" DESC, "approved_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dossiers_report_period" ON "dossiers" ("organization_id", "revenue_recognition_date", "sales_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_revenue_lines_report_estimate" ON "estimate_revenue_lines" ("organization_id", "estimate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_cost_lines_report_estimate" ON "estimate_cost_lines" ("organization_id", "estimate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_payments_report_dossier" ON "payments" ("organization_id", "dossier_id", "payment_direction", "status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_payments_report_dossier"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_revenue_lines_report_estimate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_cost_lines_report_estimate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dossiers_report_period"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_estimates_report_lookup"`,
    );
  }
}
