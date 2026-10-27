import * as bcrypt from 'bcrypt';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { RolePermission } from '../../modules/permissions/entities/role-permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { PERMISSION_CATALOG } from './permissions.catalog';
import { BootstrapInput, ORGANIZATION, runProductionAdminBootstrap } from './production-admin-bootstrap';

const databaseUrl = process.env.BOOTSTRAP_TEST_DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.slice(1) : '';
const isolatedTestDatabase = /(^|[_-])(test|testing)([_-]|$)/i.test(databaseName);
const describeDatabase = databaseUrl && isolatedTestDatabase ? describe : describe.skip;
const password = 'SecureProductionPassword2026!$';
const input: BootstrapInput = {
  email: ' Admin@Example.com ', fullName: 'Nguyen Van Admin',
  password, passwordConfirmation: password,
};

describeDatabase('production admin bootstrap PostgreSQL integration', () => {
  let db: DataSource;
  jest.setTimeout(30000);
  beforeAll(async () => {
    if (!isolatedTestDatabase) throw new Error('BOOTSTRAP_TEST_DATABASE_URL must name a dedicated database containing test/testing.');
    db = new DataSource({
      type: 'postgres',
      url: databaseUrl!,
      entities: [path.join(__dirname, '../../modules/**/*.entity{.ts,.js}')],
      migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
      migrationsRun: false,
      synchronize: false,
    });
    await db.initialize();
    if (await db.showMigrations()) await db.runMigrations({ transaction: 'all' });
  });

  beforeEach(async () => {
    await db.query('TRUNCATE TABLE user_roles, role_permissions, users, roles, permissions, departments, organization_settings, organizations RESTART IDENTITY CASCADE');
  }, 30000);

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  it('creates the organization, complete permission catalog, SUPER_ADMIN, and bcrypt admin', async () => {
    const result = await runProductionAdminBootstrap(db, input, { apply: true });
    expect(result.status).toBe('created');
    expect(await db.getRepository(Organization).findOneBy({ code: ORGANIZATION.code })).toMatchObject(ORGANIZATION);
    expect(await db.getRepository(Permission).count()).toBe(PERMISSION_CATALOG.length);
    const role = await db.getRepository(Role).findOneByOrFail({ code: 'SUPER_ADMIN' });
    expect(role.isSystem).toBe(true);
    const user = await db.getRepository(User).findOneOrFail({ where: { email: 'admin@example.com' }, relations: { roles: true } });
    expect(user.status).toBe('ACTIVE');
    expect(user.roles.map(({ code }) => code)).toEqual(['SUPER_ADMIN']);
    expect(user.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
    expect(await db.getRepository(RolePermission).count({ where: { roleId: role.id, scope: 'ALL' as any } })).toBe(PERMISSION_CATALOG.length);
  });

  it('preserves the four existing production permission rows and adds only missing codes', async () => {
    const permissionRepo = db.getRepository(Permission);
    for (const code of ['import.manage', 'kpi.view', 'kpi.view.all', 'kpi.view.team']) {
      await permissionRepo.save(permissionRepo.create({ code, name: `existing ${code}`, module: 'EXISTING' }));
    }
    await runProductionAdminBootstrap(db, input, { apply: true });
    expect(await permissionRepo.count()).toBe(PERMISSION_CATALOG.length);
    expect(await permissionRepo.findOneByOrFail({ code: 'import.manage' })).toMatchObject({ name: 'existing import.manage', module: 'EXISTING' });
  });

  it('dry-run validates and plans without changing rows', async () => {
    const result = await runProductionAdminBootstrap(db, input, { apply: false });
    expect(result.status).toBe('planned');
    for (const entity of [Organization, Permission, Role, RolePermission, User]) {
      expect(await db.getRepository(entity).count()).toBe(0);
    }
  });

  it('a second apply is an idempotent no-op and never changes the password', async () => {
    await runProductionAdminBootstrap(db, input, { apply: true });
    const userRepo = db.getRepository(User);
    const before = await userRepo.findOneByOrFail({ email: 'admin@example.com' });
    const changedInput = { ...input, email: 'other-admin@example.com', password: 'OtherStrongPassword2026!$', passwordConfirmation: 'OtherStrongPassword2026!$' };
    expect((await runProductionAdminBootstrap(db, changedInput, { apply: true })).status).toBe('already_bootstrapped');
    const after = await userRepo.findOneByOrFail({ email: 'admin@example.com' });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(await userRepo.count()).toBe(1);
  });

  it('never writes the plaintext password to stdout or stderr', async () => {
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    try {
      await runProductionAdminBootstrap(db, input, { apply: true });
      const emitted = [stdout, stderr]
        .flatMap((stream) => stream.mock.calls.map(([chunk]) => String(chunk)))
        .join('\n');
      expect(emitted).not.toContain(password);
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });

  it('rejects duplicate email and incompatible organization without data changes', async () => {
    const organizations = db.getRepository(Organization);
    await organizations.save(organizations.create({ ...ORGANIZATION, name: 'Conflicting organization' }));
    await expect(runProductionAdminBootstrap(db, input, { apply: true })).rejects.toThrow('incompatible');
    expect(await organizations.count()).toBe(1);
    await db.query('TRUNCATE TABLE organizations RESTART IDENTITY CASCADE');
    await organizations.save(organizations.create(ORGANIZATION));
    const org = await organizations.findOneByOrFail({ code: ORGANIZATION.code });
    const repo = db.getRepository(User);
    await repo.save(repo.create({ organizationId: org.id, employeeCode: 'EXISTING', fullName: 'Existing User', email: 'admin@example.com', passwordHash: 'existing-hash', status: 'ACTIVE' as any }));
    await expect(runProductionAdminBootstrap(db, input, { apply: true })).rejects.toThrow('Email đã tồn tại');
    expect(await db.getRepository(Role).count()).toBe(0);
  });

  it('rolls back every write when a mid-transaction step fails', async () => {
    await expect(runProductionAdminBootstrap(db, input, {
      apply: true,
      onStage: async (stage) => { if (stage === 'permissions') throw new Error('injected failure'); },
    })).rejects.toThrow('injected failure');
    for (const entity of [Organization, Permission, Role, RolePermission, User]) {
      expect(await db.getRepository(entity).count()).toBe(0);
    }
  });

  it('serializes concurrent first runs and creates only one admin', async () => {
    const second = { ...input, email: 'second@example.com' };
    const results = await Promise.all([
      runProductionAdminBootstrap(db, input, { apply: true }),
      runProductionAdminBootstrap(db, second, { apply: true }),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual(['already_bootstrapped', 'created']);
    expect(await db.getRepository(User).count()).toBe(1);
    expect(await db.getRepository(Role).count()).toBe(1);
  });
});
