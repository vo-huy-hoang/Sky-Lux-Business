import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { types } from 'pg';
import { AppModule } from './app.module';

// Configure pg driver to parse NUMERIC (OID 1700) as float number in Javascript
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust immediate reverse proxy so req.ip reflects real client IP safely
  const rawTrustProxy = process.env.TRUST_PROXY;
  if (rawTrustProxy === 'false' || rawTrustProxy === '0') {
    app.set('trust proxy', false);
  } else if (rawTrustProxy && !Number.isNaN(Number(rawTrustProxy))) {
    app.set('trust proxy', Number(rawTrustProxy));
  } else if (rawTrustProxy === 'true') {
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', rawTrustProxy || 1);
  }

  // Enable graceful shutdown hooks for clean database and worker teardown
  app.enableShutdownHooks();

  process.on('SIGTERM', () => {
    logger.warn(
      '🛑 SIGTERM received: Draining in-flight requests and closing connections...',
    );
  });

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  const corsOrigins = (
    process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'
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

  // Swagger Documentation Setup (disabled in production unless explicitly enabled)
  const isSwaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';

  if (isSwaggerEnabled) {
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
  }

  const port = process.env.APP_PORT || process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  if (isSwaggerEnabled) {
    logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
    );
  }
}

bootstrap();
