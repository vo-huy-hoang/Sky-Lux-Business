/**
 * User entities are frequently loaded through relations. Keep credentials out
 * of every API response that reuses those relations.
 */
export function toPublicUser<
  T extends { passwordHash?: string; refreshTokenHash?: string },
>(user: T | null | undefined): T | null | undefined {
  if (!user) return user;

  const {
    passwordHash: _passwordHash,
    refreshTokenHash: _refreshTokenHash,
    ...publicUser
  } = user as any;
  return publicUser as T;
}
