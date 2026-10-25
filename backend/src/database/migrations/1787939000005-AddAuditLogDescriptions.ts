import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogDescriptions1787939000005 implements MigrationInterface {
  name = 'AddAuditLogDescriptions1787939000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "description" VARCHAR(500)`,
    );
    await queryRunner.query(`
      UPDATE "audit_logs"
      SET "description" = CASE "action"
        WHEN 'CUSTOMER_CREATED' THEN 'Tạo khách hàng'
        WHEN 'CUSTOMER_UPDATED' THEN 'Cập nhật thông tin khách hàng'
        WHEN 'CUSTOMER_DELETED' THEN 'Xóa khách hàng'
        WHEN 'CUSTOMER_STATUS_CHANGED' THEN 'Thay đổi trạng thái khách hàng'
        WHEN 'CUSTOMER_ASSIGNEE_CHANGED' THEN 'Thay đổi nhân viên phụ trách khách hàng'
        WHEN 'SENSITIVE_DATA_VIEWED' THEN 'Xem thông tin bảo mật'
        WHEN 'CUSTOMER_LIST_EXPORTED' THEN 'Xuất danh sách khách hàng'
        WHEN 'DOSSIER_CREATED' THEN 'Tạo hồ sơ tour'
        WHEN 'DOSSIER_UPDATED' THEN 'Cập nhật hồ sơ tour'
        WHEN 'DOSSIER_DELETED' THEN 'Xóa hồ sơ tour'
        WHEN 'DOSSIER_STATUS_CHANGED' THEN 'Thay đổi trạng thái hồ sơ tour'
        WHEN 'DOSSIER_ASSIGNEE_CHANGED' THEN 'Thay đổi nhân viên phụ trách hồ sơ tour'
        WHEN 'ESTIMATE_CREATED' THEN 'Tạo báo giá'
        WHEN 'ESTIMATE_UPDATED' THEN 'Cập nhật báo giá'
        WHEN 'ESTIMATE_DELETED' THEN 'Xóa báo giá'
        WHEN 'ESTIMATE_STATUS_CHANGED' THEN 'Thay đổi trạng thái báo giá'
        WHEN 'ESTIMATE_VALUE_CHANGED' THEN 'Thay đổi giá trị báo giá'
        WHEN 'IMPORT_UPLOADED' THEN 'Tải tệp dữ liệu lên để nhập'
        WHEN 'IMPORT_CONFIRMED' THEN 'Xác nhận nhập dữ liệu'
        WHEN 'USER_CREATED' THEN 'Tạo tài khoản người dùng'
        WHEN 'USER_UPDATED' THEN 'Cập nhật tài khoản người dùng'
        WHEN 'USER_DELETED' THEN 'Xóa tài khoản người dùng'
        WHEN 'USER_ROLES_CHANGED' THEN 'Thay đổi vai trò người dùng'
        WHEN 'ROLE_CREATED' THEN 'Tạo vai trò'
        WHEN 'ROLE_UPDATED' THEN 'Cập nhật vai trò'
        WHEN 'ROLE_DELETED' THEN 'Xóa vai trò'
        WHEN 'ROLE_PERMISSIONS_CHANGED' THEN 'Thay đổi quyền của vai trò'
        WHEN 'CREATE_DOSSIER' THEN 'Tạo hồ sơ tour'
        WHEN 'UPDATE_ESTIMATE' THEN 'Cập nhật báo giá'
        WHEN 'DELETE_CUSTOMER' THEN 'Xóa khách hàng'
        WHEN 'UPDATE_ROLE' THEN 'Cập nhật vai trò'
        ELSE COALESCE("description", 'Thao tác hệ thống')
      END
      WHERE "description" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "description" SET DEFAULT 'Thao tác hệ thống'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "description" SET NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "description"`,
    );
  }
}
