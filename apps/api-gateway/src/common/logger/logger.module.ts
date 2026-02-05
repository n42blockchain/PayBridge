import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { createWinstonConfig } from './winston.config';
import { StructuredLoggerService } from './structured-logger.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        return createWinstonConfig(isProduction);
      },
    }),
  ],
  providers: [StructuredLoggerService],
  exports: [WinstonModule, StructuredLoggerService],
})
export class LoggerModule {}
