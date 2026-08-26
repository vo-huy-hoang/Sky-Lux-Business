import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'CHANGE_ME_LONG_RANDOM_SECRET',
  adminRoles: (process.env.SYSTEM_ADMIN_ROLES || 'SUPER_ADMIN,CEO_ADMIN')
    .split(',')
    .map((r) => r.trim()),
}));
