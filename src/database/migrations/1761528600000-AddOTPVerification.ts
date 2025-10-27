import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOTPVerification1761528600000 implements MigrationInterface {
  name = 'AddOTPVerification1761528600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."otp_verifications_purpose_enum" AS ENUM (
        'registration',
        'login',
        'password_reset',
        'phone_verification'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "otp_verifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "phone" character varying(15) NOT NULL,
        "code" character varying(6) NOT NULL,
        "reference" character varying(255) NOT NULL,
        "provider" character varying(50) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "verified" boolean NOT NULL DEFAULT false,
        "verified_at" TIMESTAMP,
        "purpose" "public"."otp_verifications_purpose_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_verifications" PRIMARY KEY ("id")
      )
    `);

    // Create index on phone and created_at for efficient lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_otp_verifications_phone_created"
      ON "otp_verifications" ("phone", "created_at" DESC)
    `);

    // Create index on reference for efficient lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_otp_verifications_reference"
      ON "otp_verifications" ("reference")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_otp_verifications_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_otp_verifications_phone_created"`);
    await queryRunner.query(`DROP TABLE "otp_verifications"`);
    await queryRunner.query(`DROP TYPE "public"."otp_verifications_purpose_enum"`);
  }
}
