import { createHash } from 'crypto';

export type TokenPurpose = 'access' | 'refresh' | 'stream' | 'file-download';

export function derivePurposeSecret(
  masterSecret: string,
  purpose: TokenPurpose,
): string {
  if (!masterSecret) {
    throw new Error(`Master secret is required to derive "${purpose}" key`);
  }
  return createHash('sha256')
    .update(`skylux:jwt:v1:${purpose}:${masterSecret}`)
    .digest('hex');
}

