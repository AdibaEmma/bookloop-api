import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExchangePreferencesTable1762691830003 implements MigrationInterface {
    name = 'CreateExchangePreferencesTable1762691830003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create exchange_preferences table
        await queryRunner.query(`
            CREATE TABLE "exchange_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "listing_id" uuid NOT NULL,
                "book_id" uuid NOT NULL,
                "priority" integer NOT NULL DEFAULT '1',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_exchange_preferences" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "exchange_preferences"
            ADD CONSTRAINT "FK_exchange_preferences_listing"
            FOREIGN KEY ("listing_id")
            REFERENCES "listings"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "exchange_preferences"
            ADD CONSTRAINT "FK_exchange_preferences_book"
            FOREIGN KEY ("book_id")
            REFERENCES "books"("id")
            ON DELETE NO ACTION
        `);

        // Add indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_exchange_preferences_listing"
            ON "exchange_preferences" ("listing_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_exchange_preferences_book"
            ON "exchange_preferences" ("book_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_exchange_preferences_book"`);
        await queryRunner.query(`DROP INDEX "IDX_exchange_preferences_listing"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "exchange_preferences" DROP CONSTRAINT "FK_exchange_preferences_book"`);
        await queryRunner.query(`ALTER TABLE "exchange_preferences" DROP CONSTRAINT "FK_exchange_preferences_listing"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "exchange_preferences"`);
    }

}
