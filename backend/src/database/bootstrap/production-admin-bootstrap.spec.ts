import {
  normalizeEmail,
  validateBootstrapInput,
  validateProductionDatabaseEnvironment,
} from './production-admin-bootstrap';
import { collectBootstrapInput } from './cli-input';
import { isolatedIntegrationDatabaseUrl } from './integration-test-database';

describe('production admin bootstrap input validation', () => {
  it('normalizes email and full name using the auth login convention', () => {
    expect(normalizeEmail('  Admin@Example.COM ')).toBe('admin@example.com');
    expect(
      validateBootstrapInput({
        email: ' Admin@Example.COM ',
        fullName: '  Nguyen   Van An ',
        password: 'SecurePassword2026!$',
        passwordConfirmation: 'SecurePassword2026!$',
      }),
    ).toMatchObject({ email: 'admin@example.com', fullName: 'Nguyen Van An' });
  });

  it.each(['not-an-email', 'user@localhost', ''])(
    'rejects invalid email %j',
    (email) => {
      expect(() => normalizeEmail(email)).toThrow('Email không hợp lệ');
    },
  );

  it.each([
    'shortA1!',
    'alllowercase123!!',
    'ALLUPPERCASE123!!',
    'NoDigitsPassword!!',
    'Has Space Password1!',
  ])('rejects a weak password', (password) => {
    expect(() =>
      validateBootstrapInput({
        email: 'admin@example.com',
        fullName: 'Admin',
        password,
        passwordConfirmation: password,
      }),
    ).toThrow('Mật khẩu cần ít nhất');
  });

  it('rejects mismatched password confirmation', () => {
    expect(() =>
      validateBootstrapInput({
        email: 'admin@example.com',
        fullName: 'Admin',
        password: 'SecurePassword2026!$',
        passwordConfirmation: 'DifferentPassword2026!$',
      }),
    ).toThrow('không khớp');
  });

  it('accepts dry-run input without prompting for or validating a password', async () => {
    const prompts: string[] = [];
    const input = await collectBootstrapInput(
      false,
      (question) => {
        prompts.push(question);
        return Promise.resolve(
          question.startsWith('Email') ? 'admin@example.com' : 'Admin User',
        );
      },
      (question) => {
        prompts.push(question);
        return Promise.reject(
          new Error(`unexpected secret prompt ${question}`),
        );
      },
    );
    expect(prompts).toEqual(['Email admin: ', 'Họ tên admin: ']);
    expect(validateBootstrapInput(input, false)).toMatchObject({
      email: 'admin@example.com',
      fullName: 'Admin User',
    });
    expect(() => validateBootstrapInput(input, true)).toThrow('không khớp');
  });

  it('prompts twice for a secret only in apply mode', async () => {
    const prompts: string[] = [];
    const input = await collectBootstrapInput(
      true,
      (question) => {
        prompts.push(question);
        return Promise.resolve(
          question.startsWith('Email') ? 'admin@example.com' : 'Admin User',
        );
      },
      (question) => {
        prompts.push(question);
        return Promise.resolve('SecurePassword2026!$');
      },
    );
    expect(prompts).toEqual([
      'Email admin: ',
      'Họ tên admin: ',
      'Mật khẩu (không hiển thị): ',
      'Nhập lại mật khẩu: ',
    ]);
    expect(validateBootstrapInput(input, true).password).toBe(
      'SecurePassword2026!$',
    );
  });

  it('rejects a missing name', () => {
    expect(() =>
      validateBootstrapInput({
        email: 'admin@example.com',
        fullName: ' ',
        password: 'SecurePassword2026!$',
        passwordConfirmation: 'SecurePassword2026!$',
      }),
    ).toThrow('Họ tên');
  });

  it('refuses missing database credentials and non-production environments', () => {
    expect(() =>
      validateProductionDatabaseEnvironment({ NODE_ENV: 'production' }),
    ).toThrow('DB_HOST');
    expect(() =>
      validateProductionDatabaseEnvironment({
        NODE_ENV: 'test',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USER: 'test',
        DB_PASSWORD: 'test',
        DB_NAME: 'test',
      }),
    ).toThrow('NODE_ENV=production');
    expect(() =>
      validateProductionDatabaseEnvironment({
        NODE_ENV: 'production',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USER: 'test',
        DB_PASSWORD: 'test',
        DB_NAME: 'skylux',
      }),
    ).not.toThrow();
  });

  it('restricts truncating integration tests to exact loopback test databases and fails closed in CI', () => {
    const prior = {
      ci: process.env.CI,
      nodeEnv: process.env.NODE_ENV,
      url: process.env.BOOTSTRAP_TEST_DATABASE_URL,
    };
    try {
      delete process.env.CI;
      process.env.NODE_ENV = 'test';
      process.env.BOOTSTRAP_TEST_DATABASE_URL =
        'postgresql://test:test@127.0.0.1:5432/skylux_bootstrap_test';
      expect(
        isolatedIntegrationDatabaseUrl(
          'BOOTSTRAP_TEST_DATABASE_URL',
          'skylux_bootstrap_test',
        ),
      ).toBe(process.env.BOOTSTRAP_TEST_DATABASE_URL);
      process.env.BOOTSTRAP_TEST_DATABASE_URL =
        'postgresql://user:pass@production.example:5432/skylux_bootstrap_test';
      expect(() =>
        isolatedIntegrationDatabaseUrl(
          'BOOTSTRAP_TEST_DATABASE_URL',
          'skylux_bootstrap_test',
        ),
      ).toThrow('local PostgreSQL');
      process.env.BOOTSTRAP_TEST_DATABASE_URL =
        'postgresql://test:test@127.0.0.1:5432/skylux_prod';
      expect(() =>
        isolatedIntegrationDatabaseUrl(
          'BOOTSTRAP_TEST_DATABASE_URL',
          'skylux_bootstrap_test',
        ),
      ).toThrow('dedicated database');
      delete process.env.BOOTSTRAP_TEST_DATABASE_URL;
      process.env.CI = 'true';
      expect(() =>
        isolatedIntegrationDatabaseUrl(
          'BOOTSTRAP_TEST_DATABASE_URL',
          'skylux_bootstrap_test',
        ),
      ).toThrow('must not be skipped');
    } finally {
      if (prior.ci === undefined) delete process.env.CI;
      else process.env.CI = prior.ci;
      if (prior.nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prior.nodeEnv;
      if (prior.url === undefined)
        delete process.env.BOOTSTRAP_TEST_DATABASE_URL;
      else process.env.BOOTSTRAP_TEST_DATABASE_URL = prior.url;
    }
  });
});
