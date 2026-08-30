import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.R2_ENDPOINT || process.env.AWS_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET || process.env.AWS_BUCKET || 'skylux-files',
  publicDomain: process.env.R2_PUBLIC_DOMAIN,
  region: process.env.AWS_REGION || 'auto',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
}));
