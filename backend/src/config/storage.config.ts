import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  folder: process.env.CLOUDINARY_FOLDER || '',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
}));
