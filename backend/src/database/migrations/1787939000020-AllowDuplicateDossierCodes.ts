import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Import workbooks may contain repeated dossier codes. The import flow is
 * intentionally permissive, so the database must not reject those rows.
 */
export class AllowDuplicateDossierCodes1787939000020
  implements MigrationInterface
{
  name = 'AllowDuplicateDossierCodes1787939000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_2f408e41e65ebf503dad3ec713"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_2f408e41e65ebf503dad3ec713" ON "dossiers" ("code")',
    );
  }
}
