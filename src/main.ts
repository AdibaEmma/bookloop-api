import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global API prefix with version
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('BookLoop API')
    .setDescription(
      'Location-based book exchange platform for Ghana. Share, exchange, and discover books in your community.',
    )
    .setVersion('1.0')
    .addTag('users', 'User management and profiles')
    .addTag('auth', 'Authentication and authorization')
    .addTag('books', 'Book catalog and metadata')
    .addTag('listings', 'Book listings with geospatial search')
    .addTag('exchanges', 'Book exchange management')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT || 8000;
  await app.listen(port);

  logger.log(`BookLoop API running on http://localhost:${port}`, 'Bootstrap');
  logger.log(
    `API Documentation available at http://localhost:${port}/api/v1/docs`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
