import {
  normalizeEmail,
  validateBootstrapInput,
  validateProductionDatabaseEnvironment,
} from './production-admin-bootstrap';

describe('production admin bootstrap input validation', () => {
  it('normalizes email and full name using the auth login convention', () => {
    expect(normalizeEmail('  Admin@Example.COM ')).toBe('admin@example.com');
    expect(validateBootstrapInput({
      email: ' Admin@Example.COM ',
      fullName: '  Nguyen   Van An ',
      password: 'SecurePassword2026!$',
      passwordConfirmation: 'SecurePassword2026!$',
    })).toMatchObject({ email: 'admin@example.com', fullName: 'Nguyen Van An' });
  });

  it.each(['not-an-email', 'user@localhost', ''])('rejects invalid email %j', (email) => {
    expect(() => normalizeEmail(email)).toThrow('Email không hợp lệ');
  });

  it.each(['shortA1!', 'alllowercase123!!', 'ALLUPPERCASE123!!', 'NoDigitsPassword!!', 'Has Space Password1!'])
    ('rejects a weak password', (password) => {
      expect(() => validateBootstrapInput({
        email: 'admin@example.com', fullName: 'Admin', password, passwordConfirmation: password,
      })).toThrow('Mật khẩu cần ít nhất');
    });

  it('rejects mismatched password confirmation', () => {
    expect(() => validateBootstrapInput({
      email: 'admin@example.com', fullName: 'Admin',
      password: 'SecurePassword2026!$', passwordConfirmation: 'DifferentPassword2026!$',
    })).toThrow('không khớp');
  });

  it('rejects a missing name', () => {
    expect(() => validateBootstrapInput({
      email: 'admin@example.com', fullName: ' ',
      password: 'SecurePassword2026!$', passwordConfirmation: 'SecurePassword2026!$',
    })).toThrow('Họ tên');
  });

  it('refuses missing database credentials and non-production environments', () => {
    expect(() => validateProductionDatabaseEnvironment({ NODE_ENV: 'production' })).toThrow('DB_HOST');
    expect(() => validateProductionDatabaseEnvironment({
      NODE_ENV: 'test', DB_HOST: 'localhost', DB_PORT: '5432', DB_USER: 'test', DB_PASSWORD: 'test', DB_NAME: 'test',
    })).toThrow('NODE_ENV=production');
    expect(() => validateProductionDatabaseEnvironment({
      NODE_ENV: 'production', DB_HOST: 'localhost', DB_PORT: '5432', DB_USER: 'test', DB_PASSWORD: 'test', DB_NAME: 'skylux',
    })).not.toThrow();
  });
});
