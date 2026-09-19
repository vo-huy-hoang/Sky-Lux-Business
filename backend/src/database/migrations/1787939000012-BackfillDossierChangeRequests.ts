import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillDossierChangeRequests1787939000012
  implements MigrationInterface
{
  name = 'BackfillDossierChangeRequests1787939000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "dossier_change_requests" (
        "organization_id",
        "dossier_id",
        "requested_by",
        "request_text",
        "status",
        "requested_at",
        "created_at",
        "updated_at"
      )
      SELECT
        history."organization_id",
        history."dossier_id",
        history."actor_user_id",
        COALESCE(NULLIF(TRIM(history."comment"), ''), 'Vui lòng kiểm tra và bổ sung lại hồ sơ.'),
        'OPEN',
        history."created_at",
        history."created_at",
        history."updated_at"
      FROM "workflow_history" history
      WHERE history."action" = 'REQUEST_CHANGES'
        AND history."actor_user_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "dossier_change_requests" request
          WHERE request."dossier_id" = history."dossier_id"
            AND request."requested_by" = history."actor_user_id"
            AND request."requested_at" = history."created_at"
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "dossier_change_requests" request
      WHERE request."requested_at" IN (
        SELECT history."created_at"
        FROM "workflow_history" history
        WHERE history."action" = 'REQUEST_CHANGES'
      )
    `);
  }
}
