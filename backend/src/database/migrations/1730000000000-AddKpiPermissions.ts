import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKpiPermissions1730000000000 implements MigrationInterface {
  name = 'AddKpiPermissions1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "code", "name", "module")
      VALUES
        (uuid_generate_v4(), 'kpi.view', 'Xem KPI cá nhân', 'KPI'),
        (uuid_generate_v4(), 'kpi.view.team', 'Xem KPI phòng ban', 'KPI'),
        (uuid_generate_v4(), 'kpi.view.all', 'Xem toàn bộ KPI', 'KPI')
      ON CONFLICT ("code") DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scope")
      SELECT uuid_generate_v4(), r."id", p."id", 'ALL'
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'SALES'
        AND p."code" = 'kpi.view'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scope")
      SELECT uuid_generate_v4(), r."id", p."id", 'ALL'
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'OPERATOR'
        AND p."code" IN ('kpi.view', 'kpi.view.team')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" rp
      USING "roles" r, "permissions" p
      WHERE rp."role_id" = r."id"
        AND rp."permission_id" = p."id"
        AND r."code" IN ('SALES', 'OPERATOR')
        AND p."code" IN ('kpi.view', 'kpi.view.team');
    `);

    await queryRunner.query(`
      DELETE FROM "permissions" p
      WHERE p."code" IN ('kpi.view', 'kpi.view.team', 'kpi.view.all')
        AND NOT EXISTS (
          SELECT 1 FROM "role_permissions" rp
          WHERE rp."permission_id" = p."id"
        );
    `);
  }
}
