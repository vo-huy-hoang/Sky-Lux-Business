import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1794935000000: Backfill Baseline Role Permissions
 *
 * Ensures that all canonical tenant roles (SALES, OPERATOR, CEO_ADMIN) across
 * all active organizations are guaranteed to possess their respective baseline
 * permissions (such as dashboard.sales for SALES, dashboard.operator for OPERATOR,
 * and all active catalog permissions for CEO_ADMIN).
 */
export class BackfillBaselineRolePermissions1794935000000
  implements MigrationInterface
{
  name = 'BackfillBaselineRolePermissions1794935000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure baseline dashboard permissions exist in permissions table
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "code", "name", "module", "created_at", "updated_at")
      VALUES
        (uuid_generate_v4(), 'dashboard.sales', 'Xem Dashboard Sales', 'DASHBOARD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (uuid_generate_v4(), 'dashboard.operator', 'Xem Dashboard Operator', 'DASHBOARD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (uuid_generate_v4(), 'dashboard.ceo', 'Xem Dashboard CEO', 'DASHBOARD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("code") DO NOTHING;
    `);

    // 2. Backfill SALES and OPERATOR baseline permissions across all organizations
    await queryRunner.query(`
      WITH specific_grants (role_code, permission_code) AS (
        VALUES
          -- SALES baseline
          ('SALES', 'dashboard.sales'),
          ('SALES', 'dossier.view.own'),
          ('SALES', 'dossier.view.team'),
          ('SALES', 'dossier.create'),
          ('SALES', 'dossier.update'),
          ('SALES', 'dossier.submit'),
          ('SALES', 'estimate.create'),
          ('SALES', 'estimate.update'),
          ('SALES', 'estimate.view'),
          ('SALES', 'import.manage'),
          ('SALES', 'customer.manage'),
          ('SALES', 'supplier.manage'),
          ('SALES', 'task.view'),
          ('SALES', 'task.manage'),
          ('SALES', 'user.view'),
          ('SALES', 'chat.access'),
          ('SALES', 'master_data.view'),
          ('SALES', 'kpi.manage'),
          ('SALES', 'kpi.view'),
          ('SALES', 'document.view'),
          ('SALES', 'approval.view'),
          ('SALES', 'department.view'),
          ('SALES', 'report.view'),
          -- OPERATOR baseline
          ('OPERATOR', 'dashboard.operator'),
          ('OPERATOR', 'dossier.view.all'),
          ('OPERATOR', 'dossier.view.team'),
          ('OPERATOR', 'dossier.update'),
          ('OPERATOR', 'dossier.approve'),
          ('OPERATOR', 'customer.manage'),
          ('OPERATOR', 'estimate.view'),
          ('OPERATOR', 'estimate.update'),
          ('OPERATOR', 'import.manage'),
          ('OPERATOR', 'supplier.manage'),
          ('OPERATOR', 'task.view'),
          ('OPERATOR', 'task.manage'),
          ('OPERATOR', 'user.view'),
          ('OPERATOR', 'chat.access'),
          ('OPERATOR', 'master_data.view'),
          ('OPERATOR', 'kpi.view'),
          ('OPERATOR', 'kpi.view.team'),
          ('OPERATOR', 'document.view'),
          ('OPERATOR', 'approval.view'),
          ('OPERATOR', 'department.view'),
          ('OPERATOR', 'department.manage'),
          ('OPERATOR', 'report.view')
      ),
      grants (role_id, permission_id) AS (
        SELECT role."id", permission."id"
        FROM specific_grants specific_grant
        JOIN "roles" role
          ON role."code" = specific_grant."role_code"
         AND role."deleted_at" IS NULL
        JOIN "organizations" organization
          ON organization."id" = role."organization_id"
         AND organization."deleted_at" IS NULL
        JOIN "permissions" permission
          ON permission."code" = specific_grant."permission_code"
      )
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
        grants."role_id",
        grants."permission_id",
        'ALL',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM grants
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);

    // 3. Grant full permissions to CEO_ADMIN roles in all active organizations
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
      JOIN "organizations" organization
        ON organization."id" = role."organization_id"
       AND organization."deleted_at" IS NULL
      CROSS JOIN "permissions" permission
      WHERE role."code" = 'CEO_ADMIN'
        AND role."deleted_at" IS NULL
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Non-destructive data migration: rolling back shouldn't drop valid permissions.
  }
}
