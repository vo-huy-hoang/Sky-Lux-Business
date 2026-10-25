import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEditingWorkflowStatus1787939000021 implements MigrationInterface {
  name = 'AddEditingWorkflowStatus1787939000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."dossiers_status_enum" ADD VALUE IF NOT EXISTS 'EDITING'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."estimates_status_enum" ADD VALUE IF NOT EXISTS 'EDITING'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values safely in place.
  }
}
