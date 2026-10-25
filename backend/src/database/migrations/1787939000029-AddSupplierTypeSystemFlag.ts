import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierTypeSystemFlag1787939000029
  implements MigrationInterface
{
  name = 'AddSupplierTypeSystemFlag1787939000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_types" ADD COLUMN "is_system" boolean NOT NULL DEFAULT false`,
    );
    // These are the built-in seed rows from the legacy catalog. Custom rows
    // are scoped separately by the preceding organization migration.
    await queryRunner.query(`
      UPDATE "supplier_types"
      SET "is_system" = true
      WHERE "organization_id" IS NULL
        AND "code" IN ('HOTEL', 'RESTAURANT', 'TRANSPORT', 'AIRLINE', 'LAND_TOUR')
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_supplier_types_system" ON "supplier_types" ("is_system") WHERE "is_system" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_supplier_types_system"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_types" DROP COLUMN "is_system"`,
    );
  }
}
