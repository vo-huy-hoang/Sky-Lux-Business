import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSensitiveAuditDescription1787939000006 implements MigrationInterface {
  name = 'RenameSensitiveAuditDescription1787939000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "audit_logs"
       SET "description" = 'Xem thông tin bảo mật'
       WHERE "action" = 'SENSITIVE_DATA_VIEWED'
         AND "description" = 'Xem dữ liệu nhạy cảm'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "audit_logs"
       SET "description" = 'Xem dữ liệu nhạy cảm'
       WHERE "action" = 'SENSITIVE_DATA_VIEWED'
         AND "description" = 'Xem thông tin bảo mật'`,
    );
  }
}
