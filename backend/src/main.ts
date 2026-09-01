import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { types } from 'pg';
import { AppModule } from './app.module';

// Configure pg driver to parse NUMERIC (OID 1700) as float number in Javascript
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global Prefix: /api
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Sky-Lux CRM API')
    .setDescription('Tài liệu API hệ thống Quản lý Tour & Báo giá Sky-Lux CRM')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.APP_PORT || process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(
    `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
