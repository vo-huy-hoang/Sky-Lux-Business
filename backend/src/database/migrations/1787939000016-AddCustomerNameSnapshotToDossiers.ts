import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerNameSnapshotToDossiers1787939000016 implements MigrationInterface {
  name = 'AddCustomerNameSnapshotToDossiers1787939000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dossiers"
      ADD COLUMN IF NOT EXISTS "customer_name" VARCHAR(255)
    `);

    // Restore the customer name that was present in each imported workbook
    // where the staging row is still available. This does not change the
    // shared customers table.
    await queryRunner.query(`
      UPDATE "dossiers" AS d
      SET "customer_name" = source.customer_name
      FROM (
        SELECT DISTINCT ON (ir.normalized_data->>'code')
          ir.normalized_data->>'code' AS dossier_code,
          ir.normalized_data->>'customerName' AS customer_name
        FROM "import_rows" AS ir
        WHERE ir.status = 'IMPORTED'
          AND ir.normalized_data ? 'customerName'
          AND NULLIF(TRIM(ir.normalized_data->>'customerName'), '') IS NOT NULL
        ORDER BY ir.normalized_data->>'code', ir.updated_at DESC
      ) AS source
      WHERE d.code = source.dossier_code
        AND d."customer_name" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dossiers"
      DROP COLUMN IF EXISTS "customer_name"
    `);
  }
}
