import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadReceiptsAndRoleToConversationMember1787938618351 implements MigrationInterface {
  name = 'AddReadReceiptsAndRoleToConversationMember1787938618351';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD "last_read_message_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD "last_read_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD "role" character varying(30) NOT NULL DEFAULT 'MEMBER'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP COLUMN "role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP COLUMN "last_read_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP COLUMN "last_read_message_id"`,
    );
  }
}
