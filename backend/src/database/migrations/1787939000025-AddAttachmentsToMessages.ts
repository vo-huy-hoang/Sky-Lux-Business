import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentsToMessages1787939000025 implements MigrationInterface {
  name = 'AddAttachmentsToMessages1787939000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "attachments"`,
    );
  }
}
