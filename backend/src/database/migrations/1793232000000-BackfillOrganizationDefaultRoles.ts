import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill tenant roles for active organizations created before the SaaS role
 * provisioning flow existed. CEO_ADMIN is required for Super Admin onboarding;
 * SALES and OPERATOR are required for CEO Admin account creation.
 */
export class BackfillOrganizationDefaultRoles1793232000000
  implements MigrationInterface
{
  name = 'BackfillOrganizationDefaultRoles1793232000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH default_roles (code, name, description, is_system) AS (
        VALUES
          (
            'CEO_ADMIN',
            'Ban Giám Đốc (CEO)',
            'Quản lý hoạt động trong phạm vi doanh nghiệp',
            TRUE
          ),
          (
            'SALES',
            'Chuyên Viên Kinh Doanh',
            NULL,
            FALSE
          ),
          (
            'OPERATOR',
            'Chuyên Viên Điều Hành',
            NULL,
            FALSE
          )
      )
      INSERT INTO "roles" (
        "id",
        "organization_id",
        "code",
        "name",
        "description",
        "is_system",
        "created_at",
        "updated_at"
      )
      SELECT
        uuid_generate_v4(),
        organization."id",
        default_role."code",
        default_role."name",
        default_role."description",
        default_role."is_system",
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "organizations" organization
      CROSS JOIN default_roles default_role
      WHERE organization."deleted_at" IS NULL
      ON CONFLICT ("organization_id", "code") DO NOTHING
    `);

    await queryRunner.query(`
      WITH specific_grants (role_code, permission_code) AS (
        VALUES
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
        FROM "roles" role
        JOIN "organizations" organization
          ON organization."id" = role."organization_id"
         AND organization."deleted_at" IS NULL
        CROSS JOIN "permissions" permission
        WHERE role."code" = 'CEO_ADMIN'
          AND role."deleted_at" IS NULL

        UNION

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
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This is a data backfill. Removing default roles on rollback could orphan
    // accounts assigned to them after this migration.
  }
}
