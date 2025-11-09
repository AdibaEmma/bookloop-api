import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateListingStatusDefaultToDraft1762685709001 implements MigrationInterface {
    name = 'UpdateListingStatusDefaultToDraft1762685709001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Change default value from 'available' to 'draft'
        await queryRunner.query(`ALTER TABLE "listings" ALTER COLUMN "status" SET DEFAULT 'draft'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert default back to 'available'
        await queryRunner.query(`ALTER TABLE "listings" ALTER COLUMN "status" SET DEFAULT 'available'`);
    }

}
