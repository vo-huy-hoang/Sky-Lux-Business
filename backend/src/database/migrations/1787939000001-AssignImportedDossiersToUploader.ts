import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignImportedDossiersToUploader1787939000001
  implements MigrationInterface
{
  name = 'AssignImportedDossiersToUploader1787939000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "dossiers" AS dossier
      SET "sales_user_id" = dossier."created_by"
      WHERE dossier."sales_user_id" IS NULL
        AND dossier."created_by" IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM "estimates" AS estimate
          WHERE estimate."dossier_id" = dossier."id"
            AND estimate."source_import_session_id" IS NOT NULL
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "dossiers" AS dossier
      SET "sales_user_id" = NULL
      WHERE dossier."sales_user_id" = dossier."created_by"
        AND EXISTS (
          SELECT 1
          FROM "estimates" AS estimate
          WHERE estimate."dossier_id" = dossier."id"
            AND estimate."source_import_session_id" IS NOT NULL
        )
    `);
  }
}
