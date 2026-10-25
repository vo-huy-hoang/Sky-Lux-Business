import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScopeUserEmployeeCodeToOrg1787939000024 implements MigrationInterface {
  name = 'ScopeUserEmployeeCodeToOrg1787939000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop existing global unique indexes/constraints on employee_code
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_8ae048b57cb451eb306035b1e6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_employee_code_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_8ae048b57cb451eb306035b1e6"`,
    );

    // 2. Create composite unique index scoped by organization_id and employee_code
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_org_employee_code" ON "users" ("organization_id", "employee_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_users_org_employee_code"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8ae048b57cb451eb306035b1e6" ON "users" ("employee_code")`,
    );
  }
}
