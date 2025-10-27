import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import cacheConfig from './config/cache.config';
import { DatabaseModule } from './database/database.module';
import { RoutingModule } from './routing.module';
import { LoggerModule } from './common/logger/logger.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiVersionInterceptor } from './common/interceptors/api-version.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { OtpModule } from './modules/otp/otp.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { BooksModule } from './modules/books/books.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ExchangesModule } from './modules/exchanges/exchanges.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [cacheConfig],
      envFilePath: '.env',
    }),
    // Database configuration
    DatabaseModule,
    // Cache configuration (Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) =>
        configService.get('cache'),
      inject: [ConfigService],
    }),
    // Global logger
    LoggerModule,
    // Feature modules
    AuthModule,
    OtpModule,
    RolesModule,
    UsersModule,
    BooksModule,
    ListingsModule,
    ExchangesModule,
    // Routing (must be last)
    RoutingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiVersionInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
