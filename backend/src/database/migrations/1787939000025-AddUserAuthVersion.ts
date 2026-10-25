import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAuthVersion1787939000025 implements MigrationInterface {
  name = 'AddUserAuthVersion1787939000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "auth_version" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_version"`);
  }
}
