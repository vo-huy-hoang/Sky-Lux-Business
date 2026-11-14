import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenFamilyRotation1793300000000 implements MigrationInterface {
  name = 'AddRefreshTokenFamilyRotation1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN IF NOT EXISTS "organization_id" UUID,
      ADD COLUMN IF NOT EXISTS "family_id" UUID,
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "replaced_by_token_id" UUID,
      ADD COLUMN IF NOT EXISTS "revoked_reason" VARCHAR(100);
    `);

    await queryRunner.query(`
      UPDATE "refresh_tokens"
      SET
        "family_id" = COALESCE("family_id", "id"),
        "status" = CASE WHEN "is_revoked" = TRUE THEN 'REVOKED' ELSE 'ACTIVE' END
      WHERE "family_id" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family"
      ON "refresh_tokens" ("family_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_refresh_tokens_family";
    `);
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      DROP COLUMN IF EXISTS "revoked_reason",
      DROP COLUMN IF EXISTS "replaced_by_token_id",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "family_id",
      DROP COLUMN IF EXISTS "organization_id";
    `);
  }
}

