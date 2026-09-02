import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportManagePermission1787939000003
  implements MigrationInterface
{
  name = 'AddImportManagePermission1787939000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "code", "name", "module", "created_at", "updated_at")
      VALUES (uuid_generate_v4(), 'import.manage', 'Quản lý import Excel', 'IMPORT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scope", "created_at", "updated_at")
      SELECT uuid_generate_v4(), role."id", permission."id", 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "roles" role
      CROSS JOIN "permissions" permission
      WHERE role."code" IN ('SALES', 'OPERATOR')
        AND permission."code" = 'import.manage'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" = (
        SELECT "id" FROM "permissions" WHERE "code" = 'import.manage'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" = 'import.manage'
    `);
  }
}
