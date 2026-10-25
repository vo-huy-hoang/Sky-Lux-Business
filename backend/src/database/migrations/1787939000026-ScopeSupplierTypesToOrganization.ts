import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScopeSupplierTypesToOrganization1787939000026
  implements MigrationInterface
{
  name = 'ScopeSupplierTypesToOrganization1787939000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_types" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_supplier_types_organization'
            AND conrelid = 'supplier_types'::regclass
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'supplier_types_organization_id_fkey'
            AND conrelid = 'supplier_types'::regclass
        ) THEN
          ALTER TABLE "supplier_types"
            ADD CONSTRAINT "fk_supplier_types_organization"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_68e9d3e31ea445ac25e071ac25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_types" DROP CONSTRAINT IF EXISTS "supplier_types_code_key"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_types_global_code"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_types_org_code"`,
    );

    // Keep the explicit seed catalog global. Scope legacy custom types to each
    // organization that uses them, cloning records where multiple tenants do.
    await queryRunner.query(`
      DO $$
      DECLARE
        type_row record;
        org_row record;
        first_org_id uuid;
        cloned_type_id uuid;
      BEGIN
        FOR type_row IN
          SELECT * FROM "supplier_types"
          WHERE "code" NOT IN ('HOTEL', 'RESTAURANT', 'TRANSPORT', 'AIRLINE', 'LAND_TOUR')
            AND "organization_id" IS NULL
        LOOP
          SELECT s."organization_id" INTO first_org_id
          FROM "suppliers" s
          WHERE s."supplier_type_id" = type_row."id"
          ORDER BY s."organization_id"
          LIMIT 1;

          IF first_org_id IS NULL THEN
            CONTINUE;
          END IF;

          UPDATE "supplier_types"
          SET "organization_id" = first_org_id
          WHERE "id" = type_row."id";

          FOR org_row IN
            SELECT DISTINCT s."organization_id"
            FROM "suppliers" s
            WHERE s."supplier_type_id" = type_row."id"
              AND s."organization_id" <> first_org_id
          LOOP
            DECLARE
              column_list text;
              select_list text;
              statement text;
            BEGIN
              SELECT
                string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position),
                string_agg(
                  CASE
                    WHEN column_name = 'organization_id' THEN '$1'
                    ELSE format('source_row.%I', column_name)
                  END,
                  ', ' ORDER BY ordinal_position
                )
              INTO column_list, select_list
              FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = 'supplier_types'
                AND column_name <> 'id'
                AND is_generated = 'NEVER';

              statement := format(
                'INSERT INTO "supplier_types" (%s) SELECT %s FROM "supplier_types" source_row WHERE source_row."id" = $2 RETURNING "id"',
                column_list,
                select_list
              );
              EXECUTE statement INTO cloned_type_id USING org_row."organization_id", type_row."id";
            END;

            UPDATE "suppliers"
            SET "supplier_type_id" = cloned_type_id
            WHERE "supplier_type_id" = type_row."id"
              AND "organization_id" = org_row."organization_id";
          END LOOP;
        END LOOP;
      END $$;
    `);
    // Keep orphaned legacy custom types untouched. They remain unowned and
    // are excluded from organization-facing catalog queries.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_supplier_types_system_code" ON "supplier_types" ("code") WHERE "organization_id" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_supplier_types_org_code" ON "supplier_types" ("organization_id", "code") WHERE "organization_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_types_system_code"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_types_org_code"`,
    );

    // Consolidate tenant clones by code before restoring global uniqueness.
    await queryRunner.query(`
      DO $$
      DECLARE
        type_row record;
        target_id uuid;
      BEGIN
        FOR type_row IN
          SELECT * FROM "supplier_types"
          WHERE "organization_id" IS NOT NULL
          ORDER BY "created_at", "id"
        LOOP
          SELECT "id" INTO target_id FROM "supplier_types"
          WHERE "code" = type_row."code" AND "organization_id" IS NULL
          LIMIT 1;
          IF target_id IS NULL THEN
            SELECT "id" INTO target_id FROM "supplier_types"
            WHERE "code" = type_row."code" AND "id" <> type_row."id"
            ORDER BY "created_at", "id" LIMIT 1;
          END IF;
          IF target_id IS NULL THEN
            UPDATE "supplier_types" SET "organization_id" = NULL
            WHERE "id" = type_row."id";
          ELSE
            UPDATE "suppliers" SET "supplier_type_id" = target_id
            WHERE "supplier_type_id" = type_row."id";
            DELETE FROM "supplier_types" WHERE "id" = type_row."id";
          END IF;
          target_id := NULL;
        END LOOP;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "supplier_types" DROP CONSTRAINT IF EXISTS "fk_supplier_types_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_types" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68e9d3e31ea445ac25e071ac25" ON "supplier_types" ("code")`,
    );
  }
}
