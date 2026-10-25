import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'skylux',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'skylux',
  entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  // Production migrations are applied once by the deployment pipeline.
  migrationsRun: false,
  subscribers: [__dirname + '/../database/subscribers/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
}));
