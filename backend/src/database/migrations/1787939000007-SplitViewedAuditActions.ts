import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitViewedAuditActions1787939000007 implements MigrationInterface {
  name = 'SplitViewedAuditActions1787939000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "audit_logs"
      SET
        "action" = CASE LOWER("entity_type")
          WHEN 'customer' THEN 'CUSTOMER_VIEWED'
          WHEN 'dossier' THEN 'DOSSIER_VIEWED'
          WHEN 'estimate' THEN 'ESTIMATE_VIEWED'
          WHEN 'user' THEN 'USER_VIEWED'
          ELSE "action"
        END,
        "description" = CASE LOWER("entity_type")
          WHEN 'customer' THEN 'Xem thông tin khách hàng'
          WHEN 'dossier' THEN 'Xem thông tin hồ sơ tour'
          WHEN 'estimate' THEN 'Xem thông tin báo giá'
          WHEN 'user' THEN 'Xem thông tin tài khoản'
          ELSE COALESCE("description", 'Xem thông tin được phân quyền')
        END
      WHERE "action" = 'SENSITIVE_DATA_VIEWED'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "audit_logs"
      SET
        "action" = 'SENSITIVE_DATA_VIEWED',
        "description" = 'Xem thông tin được phân quyền'
      WHERE "action" IN (
        'CUSTOMER_VIEWED',
        'DOSSIER_VIEWED',
        'ESTIMATE_VIEWED',
        'USER_VIEWED'
      )
    `);
  }
}
