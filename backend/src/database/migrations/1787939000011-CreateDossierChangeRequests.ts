import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDossierChangeRequests1787939000011
  implements MigrationInterface
{
  name = 'CreateDossierChangeRequests1787939000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "dossier_change_requests_status_enum" AS ENUM ('OPEN', 'RESPONDED')
    `);
    await queryRunner.query(`
      CREATE TABLE "dossier_change_requests" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL,
        "dossier_id" UUID NOT NULL,
        "requested_by" UUID NOT NULL,
        "responded_by" UUID,
        "request_text" TEXT NOT NULL,
        "response_text" TEXT,
        "status" "dossier_change_requests_status_enum" NOT NULL DEFAULT 'OPEN',
        "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "responded_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "fk_change_requests_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_change_requests_dossier"
          FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_change_requests_requester"
          FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_change_requests_responder"
          FOREIGN KEY ("responded_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_change_requests_dossier_status"
      ON "dossier_change_requests" ("organization_id", "dossier_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_change_requests_dossier_status"`);
    await queryRunner.query(`DROP TABLE "dossier_change_requests"`);
    await queryRunner.query(`DROP TYPE "dossier_change_requests_status_enum"`);
  }
}
