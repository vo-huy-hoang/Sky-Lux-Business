import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTourDurationToDossiers1787939000009 implements MigrationInterface {
  name = 'AddTourDurationToDossiers1787939000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dossiers"
      ADD COLUMN "tour_duration" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dossiers"
      DROP COLUMN "tour_duration"
    `);
  }
}
