import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerActivities1787939000008 implements MigrationInterface {
  name = 'CreateCustomerActivities1787939000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_activities" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "type" VARCHAR(50) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "actor_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customer_activities_customer_time"
      ON "customer_activities" ("organization_id", "customer_id", "occurred_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customer_activities_org_type_time"
      ON "customer_activities" ("organization_id", "type", "occurred_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_customer_activities_org_type_time"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_customer_activities_customer_time"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_activities"`);
  }
}
