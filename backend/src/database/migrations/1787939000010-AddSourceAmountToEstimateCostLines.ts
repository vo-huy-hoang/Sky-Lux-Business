import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceAmountToEstimateCostLines1787939000010 implements MigrationInterface {
  name = 'AddSourceAmountToEstimateCostLines1787939000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "estimate_cost_lines"
      ADD COLUMN "source_amount" numeric(18, 2)
    `);
    await queryRunner.query(`
      UPDATE "estimate_cost_lines"
      SET "source_amount" = "net_amount"
      WHERE "note" ILIKE '%Số tiền nguồn:%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "estimate_cost_lines"
      DROP COLUMN "source_amount"
    `);
  }
}
