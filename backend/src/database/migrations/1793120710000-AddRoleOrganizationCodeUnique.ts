import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleOrganizationCodeUnique1793120710000
  implements MigrationInterface
{
  name = 'AddRoleOrganizationCodeUnique1793120710000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingConstraint: Array<{ definition: string; type: string }> = await queryRunner.query(
      `SELECT pg_get_constraintdef(oid) AS definition, contype AS type
       FROM pg_constraint
       WHERE conrelid = 'roles'::regclass
         AND conname = 'uq_roles_org_code'`,
    );

    if (existingConstraint.length) {
      if (existingConstraint[0].type !== 'u') {
        throw new Error(
          'Constraint name uq_roles_org_code is already used by a non-unique constraint.',
        );
      }
      const definition = existingConstraint[0].definition
        .toLowerCase()
        .replaceAll('"', '')
        .replace(/\s+/g, ' ')
        .trim();
      if (definition !== 'unique (organization_id, code)') {
        throw new Error(
          `Constraint uq_roles_org_code exists with an unexpected definition: ${existingConstraint[0].definition}`,
        );
      }
      return;
    }

    const duplicates: Array<{
      organization_id: string;
      code: string;
      count: string;
    }> = await queryRunner.query(
      `SELECT organization_id, code, COUNT(*) AS count
       FROM roles
       GROUP BY organization_id, code
       HAVING COUNT(*) > 1
       ORDER BY organization_id, code
       LIMIT 10`,
    );

    if (duplicates.length) {
      const examples = duplicates
        .map(({ organization_id, code, count }) => `${organization_id}/${code} (${count} rows)`)
        .join('; ');
      throw new Error(
        `Cannot add uq_roles_org_code: duplicate (organization_id, code) values exist. Resolve these rows explicitly, then retry. Examples: ${examples}`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "roles"
       ADD CONSTRAINT "uq_roles_org_code"
       UNIQUE ("organization_id", "code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "uq_roles_org_code"`,
    );
  }
}
