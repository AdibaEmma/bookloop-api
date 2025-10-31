import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE', 'bookloop_db'),
        logging: configService.get('DB_LOGGING') === 'true',
        logger: 'advanced-console' as const,
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
        migrationsRun: configService.get('RUN_MIGRATIONS') === 'true',
        entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
        migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
        namingStrategy: new SnakeNamingStrategy(),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
