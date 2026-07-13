import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enables the extensions every later migration assumes:
 * - uuid-ossp: uuid_generate_v4() defaults on all primary keys
 * - postgis: geography(Point,4326) columns on users/listings/exchanges
 *
 * Timestamped one tick before InitialSchema so it always runs first on a
 * fresh database (locally these were enabled by hand, which made deploys
 * to new environments fail).
 */
export class EnableExtensions1761520039288 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
  }

  public async down(): Promise<void> {
    // Extensions are shared infrastructure — never drop them in a rollback.
  }
}
