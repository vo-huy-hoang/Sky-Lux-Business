import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairs cost lines imported before supplierId was persisted.
 *
 * The legacy importer kept the supplier in the line note as
 * "Nhà cung cấp: ...".  Reusing that snapshot lets us repair existing
 * imports without guessing from the description or changing amounts.
 */
export class BackfillImportedSupplierLinks1787939000018 implements MigrationInterface {
  name = 'BackfillImportedSupplierLinks1787939000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH parsed_lines AS (
        SELECT
          line.id AS cost_line_id,
          line.organization_id,
          btrim(substring(line.note FROM 'Nhà cung cấp:\\s*([^;]+)')) AS supplier_name
        FROM estimate_cost_lines line
        WHERE line.supplier_id IS NULL
          AND line.note ~* 'Nhà cung cấp:\\s*[^;]+'
      ),
      distinct_names AS (
        SELECT DISTINCT organization_id, supplier_name
        FROM parsed_lines
        WHERE supplier_name IS NOT NULL
          AND supplier_name <> ''
      ),
      missing_suppliers AS (
        SELECT names.organization_id, names.supplier_name
        FROM distinct_names names
        WHERE NOT EXISTS (
          SELECT 1
          FROM suppliers supplier
          WHERE supplier.organization_id = names.organization_id
            AND lower(btrim(supplier.name)) = lower(btrim(names.supplier_name))
        )
      )
      INSERT INTO suppliers (
        id,
        organization_id,
        code,
        name,
        status,
        created_at,
        updated_at
      )
      SELECT
        uuid_generate_v4(),
        missing.organization_id,
        'IMPORT-NCC-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 6)),
        missing.supplier_name,
        'ACTIVE',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM missing_suppliers missing
    `);

    await queryRunner.query(`
      WITH parsed_lines AS (
        SELECT
          line.id AS cost_line_id,
          line.organization_id,
          btrim(substring(line.note FROM 'Nhà cung cấp:\\s*([^;]+)')) AS supplier_name
        FROM estimate_cost_lines line
        WHERE line.supplier_id IS NULL
          AND line.note ~* 'Nhà cung cấp:\\s*[^;]+'
      )
      UPDATE estimate_cost_lines line
      SET supplier_id = supplier.id
      FROM parsed_lines parsed
      INNER JOIN suppliers supplier
        ON supplier.organization_id = parsed.organization_id
       AND lower(btrim(supplier.name)) = lower(btrim(parsed.supplier_name))
      WHERE line.id = parsed.cost_line_id
        AND line.supplier_id IS NULL
    `);
  }

  public async down(): Promise<void> {
    // This is a data repair. Reversing it would remove valid relationships
    // and potentially delete suppliers that users have since edited.
  }
}
