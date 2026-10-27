export function isolatedIntegrationDatabaseUrl(
  environmentVariable: string,
  expectedDatabaseName: string,
): string | undefined {
  const url = process.env[environmentVariable];
  if (!url) {
    if (process.env.CI === 'true') {
      throw new Error(
        `${environmentVariable} is required in CI; PostgreSQL integration tests must not be skipped.`,
      );
    }
    return undefined;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'PostgreSQL integration tests refuse to run when NODE_ENV=production.',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${environmentVariable} must be a valid PostgreSQL URL.`);
  }
  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${environmentVariable} must use the PostgreSQL protocol.`);
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(
      `${environmentVariable} must connect to a local PostgreSQL test container.`,
    );
  }
  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      `${environmentVariable} must target the dedicated database ${expectedDatabaseName}.`,
    );
  }
  return url;
}
