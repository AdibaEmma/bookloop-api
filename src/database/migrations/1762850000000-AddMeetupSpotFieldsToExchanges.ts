import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeetupSpotFieldsToExchanges1762850000000
  implements MigrationInterface
{
  name = 'AddMeetupSpotFieldsToExchanges1762850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add meetup_spot_id column
    await queryRunner.query(`
      ALTER TABLE "exchanges"
      ADD COLUMN IF NOT EXISTS "meetup_spot_id" uuid NULL
    `);

    // Add meetup_spot_name column
    await queryRunner.query(`
      ALTER TABLE "exchanges"
      ADD COLUMN IF NOT EXISTS "meetup_spot_name" varchar(100) NULL
    `);

    // Add index on meetup_spot_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_EXCHANGES_MEETUP_SPOT"
      ON "exchanges" ("meetup_spot_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_EXCHANGES_MEETUP_SPOT"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "exchanges"
      DROP COLUMN IF EXISTS "meetup_spot_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "exchanges"
      DROP COLUMN IF EXISTS "meetup_spot_id"
    `);
  }
}
