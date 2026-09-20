import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryTitleToEstimateCostLines1787939000013
  implements MigrationInterface
{
  name = 'AddCategoryTitleToEstimateCostLines1787939000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "estimate_cost_lines"
      ADD COLUMN "category_title" varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "estimate_cost_lines"
      DROP COLUMN "category_title"
    `);
  }
}
