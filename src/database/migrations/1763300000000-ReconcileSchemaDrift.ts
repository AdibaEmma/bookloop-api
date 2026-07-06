import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconciles real (non-cosmetic) drift between the entities and the DB, found via
 * `migration:generate`. All changes are non-destructive:
 *  - timestamp -> timestamptz via USING casts (stored naive values read as UTC);
 *  - varchar/check -> enum, after coercing any out-of-range values;
 *  - NOT NULL tightening only where no NULLs exist;
 *  - drops one dead column that was verified empty (exchanges.meetup_location_id).
 *
 * Deliberately NOT touched: index/FK *renaming* (cosmetic churn) and
 * notifications.updated_at (a dead column that still holds real data).
 */
export class ReconcileSchemaDrift1763300000000 implements MigrationInterface {
  name = 'ReconcileSchemaDrift1763300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Timestamps -> timestamptz. Stored naive values are treated as UTC.
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "read_at" TYPE timestamptz USING "read_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "updated_at" SET DEFAULT now()`);

    // 2) otp_verifications.purpose: varchar + CHECK -> existing enum (values already valid).
    await queryRunner.query(`ALTER TABLE "otp_verifications" DROP CONSTRAINT IF EXISTS "otp_verifications_purpose_check"`);
    await queryRunner.query(`ALTER TABLE "otp_verifications" ALTER COLUMN "purpose" TYPE "public"."otp_verifications_purpose_enum" USING "purpose"::"public"."otp_verifications_purpose_enum"`);

    // 3) meetup_spots.category: varchar -> new enum. Coerce out-of-range values
    //    (e.g. the seeded 'public') to 'other' before casting so the cast can't fail.
    await queryRunner.query(`CREATE TYPE "public"."meetup_spots_category_enum" AS ENUM ('mall', 'library', 'cafe', 'park', 'university', 'metro_station', 'community_center', 'bookstore', 'other')`);
    await queryRunner.query(`UPDATE "meetup_spots" SET "category" = 'other' WHERE "category" IS NULL OR "category" NOT IN ('mall', 'library', 'cafe', 'park', 'university', 'metro_station', 'community_center', 'bookstore', 'other')`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "category" TYPE "public"."meetup_spots_category_enum" USING "category"::"public"."meetup_spots_category_enum"`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "category" SET DEFAULT 'other'`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "category" SET NOT NULL`);

    // 4) NOT NULL tightening (verified: no NULLs present).
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "is_featured" SET DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "is_featured" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "usage_count" SET DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "usage_count" SET NOT NULL`);

    // 5) Drop the dead, verified-empty column + its FK (superseded by meetup_spot_id).
    await queryRunner.query(`ALTER TABLE "exchanges" DROP CONSTRAINT IF EXISTS "fk_exchanges_meetup_location"`);
    await queryRunner.query(`ALTER TABLE "exchanges" DROP COLUMN IF EXISTS "meetup_location_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 5) Re-add the column (structure only; it was empty).
    await queryRunner.query(`ALTER TABLE "exchanges" ADD COLUMN IF NOT EXISTS "meetup_location_id" uuid`);
    await queryRunner.query(`ALTER TABLE "exchanges" ADD CONSTRAINT "fk_exchanges_meetup_location" FOREIGN KEY ("meetup_location_id") REFERENCES "meetup_spots"("id") ON DELETE SET NULL`);

    // 4) Loosen NOT NULL.
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "usage_count" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "is_featured" DROP NOT NULL`);

    // 3) category enum -> varchar.
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "category" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "category" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "category" TYPE character varying(50) USING "category"::text`);
    await queryRunner.query(`DROP TYPE "public"."meetup_spots_category_enum"`);

    // 2) otp purpose enum -> varchar + CHECK.
    await queryRunner.query(`ALTER TABLE "otp_verifications" ALTER COLUMN "purpose" TYPE character varying(50) USING "purpose"::text`);
    await queryRunner.query(`ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_purpose_check" CHECK ("purpose" IN ('registration', 'login', 'password_reset', 'phone_verification'))`);

    // 1) timestamptz -> timestamp.
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "meetup_spots" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "read_at" TYPE timestamp USING "read_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`);
  }
}
