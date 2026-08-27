import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDateOfBirthToCustomers1724700000000 implements MigrationInterface {
  name = 'AddDateOfBirthToCustomers1724700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers" DROP COLUMN IF EXISTS "date_of_birth";
    `);
  }
}
