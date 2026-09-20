import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1787939000014 implements MigrationInterface {
  name = 'AddUserPreferences1787939000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "notification_preferences" JSONB NOT NULL DEFAULT '{
        "taskAssignments": false,
        "dossierUpdates": false,
        "appointmentReminders": false,
        "periodicReports": false
      }'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "notification_preferences",
      DROP COLUMN IF EXISTS "two_factor_enabled"
    `);
  }
}
