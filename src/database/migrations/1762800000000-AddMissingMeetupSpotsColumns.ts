import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingMeetupSpotsColumns1762800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to meetup_spots table
    await queryRunner.query(`
      ALTER TABLE meetup_spots
      ADD COLUMN IF NOT EXISTS opening_time VARCHAR(20),
      ADD COLUMN IF NOT EXISTS closing_time VARCHAR(20),
      ADD COLUMN IF NOT EXISTS operating_hours TEXT,
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0
    `);

    // Create indexes for the new columns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_MEETUP_SPOTS_CATEGORY" ON meetup_spots(category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_MEETUP_SPOTS_IS_ACTIVE" ON meetup_spots(is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_MEETUP_SPOTS_CATEGORY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_MEETUP_SPOTS_IS_ACTIVE"`);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE meetup_spots
      DROP COLUMN IF EXISTS opening_time,
      DROP COLUMN IF EXISTS closing_time,
      DROP COLUMN IF EXISTS operating_hours,
      DROP COLUMN IF EXISTS is_featured,
      DROP COLUMN IF EXISTS usage_count
    `);
  }
}
