import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { BooksModule } from './modules/books/books.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ExchangesModule } from './modules/exchanges/exchanges.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),
    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    // Feature modules
    UsersModule,
    BooksModule,
    ListingsModule,
    ExchangesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
