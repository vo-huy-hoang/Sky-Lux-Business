import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreserveImportedCostAmounts1787939000002
  implements MigrationInterface
{
  name = 'PreserveImportedCostAmounts1787939000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "estimate_cost_lines" AS line
      SET "gross_amount" = line."net_amount"
      FROM "estimates" AS estimate
      WHERE estimate."id" = line."estimate_id"
        AND estimate."source_import_session_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "estimate_cost_lines" AS line
      SET "gross_amount" = line."net_amount" * (1 + line."vat_rate" / 100)
      FROM "estimates" AS estimate
      WHERE estimate."id" = line."estimate_id"
        AND estimate."source_import_session_id" IS NOT NULL
    `);
  }
}
