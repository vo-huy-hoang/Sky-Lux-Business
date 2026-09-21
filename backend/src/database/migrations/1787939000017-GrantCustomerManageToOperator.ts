import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrantCustomerManageToOperator1787939000017 implements MigrationInterface {
  name = 'GrantCustomerManageToOperator1787939000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "role_permissions" (
        "id",
        "role_id",
        "permission_id",
        "scope",
        "created_at",
        "updated_at"
      )
      SELECT
        uuid_generate_v4(),
        r."id",
        p."id",
        'ALL',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'OPERATOR'
        AND p."code" = 'customer.manage'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" rp
      USING "roles" r, "permissions" p
      WHERE rp."role_id" = r."id"
        AND rp."permission_id" = p."id"
        AND r."code" = 'OPERATOR'
        AND p."code" = 'customer.manage'
    `);
  }
}
