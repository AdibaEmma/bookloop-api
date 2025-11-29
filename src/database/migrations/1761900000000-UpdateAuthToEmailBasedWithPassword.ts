import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAuthToEmailBasedWithPassword1761900000000
  implements MigrationInterface
{
  name = 'UpdateAuthToEmailBasedWithPassword1761900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add password column to users table
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password" character varying(255)`,
    );

    // Update otp_verifications table to use email instead of phone
    // Rename phone column to email and update its type
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" RENAME COLUMN "phone" TO "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ALTER COLUMN "email" TYPE character varying(255)`,
    );

    // Update code column to support alphanumeric (increase length from 6 to 8)
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ALTER COLUMN "code" TYPE character varying(8)`,
    );

    // Update purpose enum to replace 'phone_verification' with 'email_verification'
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" DROP CONSTRAINT IF EXISTS "CHK_otp_verifications_purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ALTER COLUMN "purpose" TYPE character varying(50)`,
    );
    await queryRunner.query(
      `UPDATE "otp_verifications" SET "purpose" = 'email_verification' WHERE "purpose" = 'phone_verification'`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" DROP CONSTRAINT IF EXISTS "otp_verifications_purpose_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_purpose_check" CHECK ("purpose" IN ('registration', 'login', 'password_reset', 'email_verification'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert purpose enum
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" DROP CONSTRAINT "otp_verifications_purpose_check"`,
    );
    await queryRunner.query(
      `UPDATE "otp_verifications" SET "purpose" = 'phone_verification' WHERE "purpose" = 'email_verification'`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_purpose_check" CHECK ("purpose" IN ('registration', 'login', 'password_reset', 'phone_verification'))`,
    );

    // Revert code column
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ALTER COLUMN "code" TYPE character varying(6)`,
    );

    // Revert email back to phone
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" ALTER COLUMN "email" TYPE character varying(15)`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verifications" RENAME COLUMN "email" TO "phone"`,
    );

    // Remove password column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
  }
}
