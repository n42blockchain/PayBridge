import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { createWinstonLogger } from './common/logger';
import { I18nExceptionFilter } from './common/i18n';
import { I18nService } from 'nestjs-i18n';

async function bootstrap() {
  // Create logger early for bootstrap logging
  const isProduction = process.env.NODE_ENV === 'production';
  const bootstrapLogger = createWinstonLogger(isProduction);

  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? false : undefined, // Use Winston in production
  });

  // Use Winston logger from the module
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);

  // Security headers with helmet
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
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

  // Global filters with i18n support
  const i18nService = app.get(I18nService<Record<string, unknown>>);
  app.useGlobalFilters(new I18nExceptionFilter(i18nService));

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS - use specific origins in production
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: isProduction && corsOrigin ? corsOrigin.split(',') : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Merchant-Id',
      'X-Timestamp',
      'X-Nonce',
      'X-Sign-Type',
      'X-Signature',
      'X-Language',
    ],
  });

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PayBridge API')
      .setDescription('PayBridge Blockchain Payment System API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'X-Merchant-Id',
        },
        'merchant-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  bootstrapLogger.info(`PayBridge API Gateway running on port ${port}`);
}

bootstrap();
