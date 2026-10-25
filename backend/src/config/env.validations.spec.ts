import { validate, Environment } from './env.validations';

describe('EnvironmentVariables Validation Module', () => {
  const validBaseConfig = {
    NODE_ENV: 'development',
    APP_PORT: '3001',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_NAME: 'skylux',
    DB_USER: 'skylux',
    DB_PASSWORD: 'secure_password_123',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
    JWT_SECRET: 'super_secret_jwt_key_at_least_16_chars',
  };

  it('should successfully validate and transform valid configuration', () => {
    const validated = validate(validBaseConfig);

    expect(validated).toBeDefined();
    expect(validated.NODE_ENV).toBe(Environment.Development);
    expect(validated.APP_PORT).toBe(3001);
    expect(validated.DB_HOST).toBe('127.0.0.1');
    expect(validated.DB_PORT).toBe(5432);
    expect(validated.DB_NAME).toBe('skylux');
    expect(validated.DB_USER).toBe('skylux');
    expect(validated.DB_PASSWORD).toBe('secure_password_123');
    expect(validated.REDIS_HOST).toBe('127.0.0.1');
    expect(validated.REDIS_PORT).toBe(6379);
    expect(validated.JWT_SECRET).toBe('super_secret_jwt_key_at_least_16_chars');
  });

  it('should apply default values when optional fields are omitted', () => {
    const minimalConfig = {
      DB_HOST: '127.0.0.1',
      DB_NAME: 'skylux',
      DB_USER: 'skylux',
      DB_PASSWORD: 'password123',
      REDIS_HOST: '127.0.0.1',
      JWT_SECRET: 'minimum_16_characters_key_here',
    };

    const validated = validate(minimalConfig);

    expect(validated.NODE_ENV).toBe(Environment.Development);
    expect(validated.APP_PORT).toBe(3001);
    expect(validated.DB_PORT).toBe(5432);
    expect(validated.REDIS_PORT).toBe(6379);
  });

  it('should throw an error if JWT_SECRET is missing', () => {
    const invalidConfig = { ...validBaseConfig };
    delete (invalidConfig as any).JWT_SECRET;

    expect(() => validate(invalidConfig)).toThrow(
      /Configuration validation error: Missing or invalid environment variables/,
    );
    expect(() => validate(invalidConfig)).toThrow(/JWT_SECRET/);
  });

  it('should throw an error if JWT_SECRET is too short (< 16 characters)', () => {
    const invalidConfig = {
      ...validBaseConfig,
      JWT_SECRET: 'short_key',
    };

    expect(() => validate(invalidConfig)).toThrow(
      /JWT_SECRET must be at least 16 characters long for security/,
    );
  });

  it('should throw an error if DB_HOST is missing', () => {
    const invalidConfig = { ...validBaseConfig };
    delete (invalidConfig as any).DB_HOST;

    expect(() => validate(invalidConfig)).toThrow(/DB_HOST/);
  });

  it('should throw an error if DB_PASSWORD is missing', () => {
    const invalidConfig = { ...validBaseConfig };
    delete (invalidConfig as any).DB_PASSWORD;

    expect(() => validate(invalidConfig)).toThrow(/DB_PASSWORD/);
  });

  it('should throw an error if REDIS_HOST is missing', () => {
    const invalidConfig = { ...validBaseConfig };
    delete (invalidConfig as any).REDIS_HOST;

    expect(() => validate(invalidConfig)).toThrow(/REDIS_HOST/);
  });

  it('should throw an error if NODE_ENV is not a valid enum value', () => {
    const invalidConfig = {
      ...validBaseConfig,
      NODE_ENV: 'invalid_environment',
    };

    expect(() => validate(invalidConfig)).toThrow(/NODE_ENV/);
  });
});
