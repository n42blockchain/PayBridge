import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  I18nModule as NestI18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';

@Global()
@Module({
  imports: [
    NestI18nModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.get<string>('DEFAULT_LANGUAGE', 'en'),
        loaderOptions: {
          path: path.join(__dirname, '../../i18n/'),
          watch: configService.get('NODE_ENV') !== 'production',
        },
      }),
      resolvers: [
        // Query parameter: ?lang=zh
        { use: QueryResolver, options: ['lang', 'locale'] },
        // HTTP header: Accept-Language
        AcceptLanguageResolver,
        // Custom header: X-Language
        new HeaderResolver(['x-language']),
      ],
    }),
  ],
  exports: [NestI18nModule],
})
export class I18nModule {}
