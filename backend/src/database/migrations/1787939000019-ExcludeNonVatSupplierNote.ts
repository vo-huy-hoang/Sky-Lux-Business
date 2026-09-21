import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the supplier relationship created from the non-VAT insurance note
 * before the importer learned that section II does not contain suppliers.
 */
export class ExcludeNonVatSupplierNote1787939000019 implements MigrationInterface {
  name = 'ExcludeNonVatSupplierNote1787939000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE estimate_cost_lines line
      SET supplier_id = NULL
      FROM suppliers supplier
      WHERE line.supplier_id = supplier.id
        AND supplier.code LIKE 'IMPORT-NCC-%'
        AND lower(btrim(supplier.name)) = lower('120tr/vụ/ngày')
        AND line.note ILIKE '%Nhà cung cấp: 120tr/vụ/ngày%'
    `);

    await queryRunner.query(`
      DELETE FROM suppliers supplier
      WHERE supplier.code LIKE 'IMPORT-NCC-%'
        AND lower(btrim(supplier.name)) = lower('120tr/vụ/ngày')
        AND NOT EXISTS (
          SELECT 1
          FROM estimate_cost_lines line
          WHERE line.supplier_id = supplier.id
        )
    `);
  }

  public async down(): Promise<void> {
    // This repair intentionally does not recreate a value that is not a
    // supplier. Re-importing the workbook after the parser fix is safe.
  }
}
