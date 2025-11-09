import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExchangeRequestsTable1762692983004 implements MigrationInterface {
    name = 'CreateExchangeRequestsTable1762692983004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum for exchange request status
        await queryRunner.query(`
            CREATE TYPE "public"."exchange_requests_status_enum" AS ENUM(
                'pending',
                'accepted',
                'declined',
                'completed',
                'cancelled'
            )
        `);

        // Create exchange_requests table
        await queryRunner.query(`
            CREATE TABLE "exchange_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "requester_id" uuid NOT NULL,
                "requester_listing_id" uuid NOT NULL,
                "requested_listing_id" uuid NOT NULL,
                "owner_id" uuid NOT NULL,
                "status" "public"."exchange_requests_status_enum" NOT NULL DEFAULT 'pending',
                "message" text,
                "meetup_address" text,
                "meetup_time" TIMESTAMP,
                "requester_confirmed_completion" boolean NOT NULL DEFAULT false,
                "owner_confirmed_completion" boolean NOT NULL DEFAULT false,
                "completed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_exchange_requests" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "exchange_requests"
            ADD CONSTRAINT "FK_exchange_requests_requester"
            FOREIGN KEY ("requester_id")
            REFERENCES "users"("id")
            ON DELETE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "exchange_requests"
            ADD CONSTRAINT "FK_exchange_requests_requester_listing"
            FOREIGN KEY ("requester_listing_id")
            REFERENCES "listings"("id")
            ON DELETE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "exchange_requests"
            ADD CONSTRAINT "FK_exchange_requests_requested_listing"
            FOREIGN KEY ("requested_listing_id")
            REFERENCES "listings"("id")
            ON DELETE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "exchange_requests"
            ADD CONSTRAINT "FK_exchange_requests_owner"
            FOREIGN KEY ("owner_id")
            REFERENCES "users"("id")
            ON DELETE NO ACTION
        `);

        // Add indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_exchange_requests_requester"
            ON "exchange_requests" ("requester_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_exchange_requests_owner"
            ON "exchange_requests" ("owner_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_exchange_requests_status"
            ON "exchange_requests" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_exchange_requests_requested_listing"
            ON "exchange_requests" ("requested_listing_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_exchange_requests_requested_listing"`);
        await queryRunner.query(`DROP INDEX "IDX_exchange_requests_status"`);
        await queryRunner.query(`DROP INDEX "IDX_exchange_requests_owner"`);
        await queryRunner.query(`DROP INDEX "IDX_exchange_requests_requester"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "exchange_requests" DROP CONSTRAINT "FK_exchange_requests_owner"`);
        await queryRunner.query(`ALTER TABLE "exchange_requests" DROP CONSTRAINT "FK_exchange_requests_requested_listing"`);
        await queryRunner.query(`ALTER TABLE "exchange_requests" DROP CONSTRAINT "FK_exchange_requests_requester_listing"`);
        await queryRunner.query(`ALTER TABLE "exchange_requests" DROP CONSTRAINT "FK_exchange_requests_requester"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "exchange_requests"`);

        // Drop enum
        await queryRunner.query(`DROP TYPE "public"."exchange_requests_status_enum"`);
    }

}
