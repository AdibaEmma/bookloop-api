import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  throw new Error('Missing DB_PASSWORD environment variable');
}

export const AppDataSource = new DataSource({
  namingStrategy: new SnakeNamingStrategy(),
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: process.env.DB_DATABASE || 'bookloop_db',
  logging: process.env.DB_LOGGING === 'true',
  logger: 'advanced-console',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  migrationsRun: process.env.RUN_MIGRATIONS === 'true',
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
