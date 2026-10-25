import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrantImportManageToCeoAdmin1787939000023 implements MigrationInterface {
  name = 'GrantImportManageToCeoAdmin1787939000023';

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
        role."id",
        permission."id",
        'ALL',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "roles" role
      CROSS JOIN "permissions" permission
      WHERE role."code" = 'CEO_ADMIN'
        AND permission."code" = 'import.manage'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" role_permission
      USING "roles" role, "permissions" permission
      WHERE role_permission."role_id" = role."id"
        AND role_permission."permission_id" = permission."id"
        AND role."code" = 'CEO_ADMIN'
        AND permission."code" = 'import.manage'
    `);
  }
}
