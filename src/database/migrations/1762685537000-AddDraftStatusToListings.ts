import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDraftStatusToListings1762685537000 implements MigrationInterface {
    name = 'AddDraftStatusToListings1762685537000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'draft' to the listings_status_enum
        await queryRunner.query(`ALTER TYPE "public"."listings_status_enum" ADD VALUE 'draft'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL does not support removing enum values directly
        // We would need to recreate the entire enum and update the column
        // For now, we'll leave this as a comment
        // In production, you would need to:
        // 1. Create a new enum without 'draft'
        // 2. Alter the column to use the new enum
        // 3. Drop the old enum
        // 4. Rename the new enum
    }

}
