import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { DataSource, MigrationInterface } from 'typeorm';
import { isolatedIntegrationDatabaseUrl } from './integration-test-database';

const databaseUrl = isolatedIntegrationDatabaseUrl(
  'ROLE_UNIQUE_TEST_DATABASE_URL',
  'skylux_role_unique_test',
);
const describeDatabase = databaseUrl ? describe : describe.skip;
const newMigrationFile = '1793120710000-AddRoleOrganizationCodeUnique.ts';
const localRequire = createRequire(__filename);

function loadMigrationClasses(
  excludeNewMigration = false,
): Array<new () => MigrationInterface> {
  const migrationDirectory = path.resolve(__dirname, '../migrations');
  const files = fs
    .readdirSync(migrationDirectory)
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('.spec.ts') &&
        file !== newMigrationFile,
    );
  const classes = files.flatMap((file) =>
    Object.values(
      localRequire(path.join(migrationDirectory, file)) as Record<
        string,
        unknown
      >,
    ),
  ) as Array<new () => MigrationInterface>;
  if (excludeNewMigration) return classes;
  const newMigration = localRequire(
    path.join(migrationDirectory, newMigrationFile),
  ) as Record<string, unknown>;
  return [
    ...classes,
    ...(Object.values(newMigration) as Array<new () => MigrationInterface>),
  ] as Array<new () => MigrationInterface>;
}

function createDataSource(
  migrations: Array<new () => MigrationInterface>,
): DataSource {
  return new DataSource({
    type: 'postgres',
    url: databaseUrl!,
    migrations,
    migrationsRun: false,
    synchronize: false,
    logging: false,
  });
}

async function roleUniqueConstraint(dataSource: DataSource) {
  return dataSource.query(
    `SELECT conname, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conrelid = 'roles'::regclass
       AND conname = 'uq_roles_org_code'`,
  );
}

describeDatabase(
  'roles organization/code unique migration PostgreSQL integration',
  () => {
    jest.setTimeout(60000);
    let previousDataSource: DataSource | undefined;
    let deploymentDataSource: DataSource | undefined;

    afterAll(async () => {
      if (previousDataSource?.isInitialized) await previousDataSource.destroy();
      if (deploymentDataSource?.isInitialized)
        await deploymentDataSource.destroy();
    });

    it('reproduces deployed schema drift, refuses duplicates without data loss, then migrates through TypeORM', async () => {
      if (!databaseUrl)
        throw new Error('ROLE_UNIQUE_TEST_DATABASE_URL is required.');

      previousDataSource = createDataSource(loadMigrationClasses(true));
      await previousDataSource.initialize();
      const [{ server_version_num: serverVersion }] =
        await previousDataSource.query('SHOW server_version_num');
      expect(Number(serverVersion)).toBeGreaterThanOrEqual(160000);
      expect(Number(serverVersion)).toBeLessThan(170000);
      await previousDataSource.runMigrations({ transaction: 'all' });
      const [{ count: appliedMigrations }] = await previousDataSource.query(
        'SELECT COUNT(*)::int AS count FROM migrations',
      );
      expect(appliedMigrations).toBe(34);
      expect(await roleUniqueConstraint(previousDataSource)).toHaveLength(0);

      const [{ id: organizationId }] = await previousDataSource.query(
        `INSERT INTO organizations (code, name, slug)
       VALUES ('ROLE-UNIQUE-TEST', 'Role Unique Test', 'role-unique-test')
       RETURNING id`,
      );
      await previousDataSource.query(
        `INSERT INTO roles (organization_id, code, name)
       VALUES ($1, 'DUPLICATE', 'First'), ($1, 'DUPLICATE', 'Second')`,
        [organizationId],
      );
      await previousDataSource.destroy();

      deploymentDataSource = createDataSource(loadMigrationClasses());
      await deploymentDataSource.initialize();
      await expect(
        deploymentDataSource.runMigrations({ transaction: 'all' }),
      ).rejects.toThrow(/duplicate \(organization_id, code\) values exist/i);

      const duplicateRows = await deploymentDataSource.query(
        `SELECT id FROM roles WHERE organization_id = $1 AND code = 'DUPLICATE'`,
        [organizationId],
      );
      expect(duplicateRows).toHaveLength(2);
      expect(await roleUniqueConstraint(deploymentDataSource)).toHaveLength(0);
      expect(
        await deploymentDataSource.query(
          `SELECT id FROM migrations WHERE name = $1`,
          ['AddRoleOrganizationCodeUnique1793120710000'],
        ),
      ).toHaveLength(0);

      // Test-only cleanup of the deliberately invalid fixture; the migration itself never deletes rows.
      await deploymentDataSource.query(
        `DELETE FROM roles WHERE organization_id = $1 AND code = 'DUPLICATE'`,
        [organizationId],
      );
      const applied = await deploymentDataSource.runMigrations({
        transaction: 'all',
      });
      expect(applied.map(({ name }) => name)).toContain(
        'AddRoleOrganizationCodeUnique1793120710000',
      );
      expect(await roleUniqueConstraint(deploymentDataSource)).toMatchObject([
        {
          conname: 'uq_roles_org_code',
          definition: 'UNIQUE (organization_id, code)',
        },
      ]);

      await deploymentDataSource.query(
        `INSERT INTO roles (organization_id, code, name)
       VALUES ($1, 'SUPER_ADMIN', 'Admin')`,
        [organizationId],
      );
      await expect(
        deploymentDataSource.query(
          `INSERT INTO roles (organization_id, code, name)
         VALUES ($1, 'SUPER_ADMIN', 'Duplicate Admin')`,
          [organizationId],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      expect(
        await deploymentDataSource.runMigrations({ transaction: 'all' }),
      ).toHaveLength(0);
      await deploymentDataSource.destroy();
    });
  },
);
