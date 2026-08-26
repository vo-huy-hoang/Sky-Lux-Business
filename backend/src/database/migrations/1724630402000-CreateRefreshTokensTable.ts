import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1724630402000 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1724630402000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" VARCHAR(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "is_revoked" BOOLEAN NOT NULL DEFAULT FALSE,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_hash" ON "refresh_tokens" ("token_hash");
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "refresh_tokens";
    `);
  }
}
