import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToBookISBN1762692000000 implements MigrationInterface {
    name = 'AddUniqueConstraintToBookISBN1762692000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, remove any duplicate ISBNs by keeping only the oldest record
        await queryRunner.query(`
            DELETE FROM books
            WHERE id IN (
                SELECT b2.id
                FROM books b1
                INNER JOIN books b2 ON b1.isbn = b2.isbn AND b1.created_at < b2.created_at
                WHERE b1.isbn IS NOT NULL
            )
        `);

        // Add unique constraint to isbn column
        await queryRunner.query(`
            ALTER TABLE "books"
            ADD CONSTRAINT "UQ_books_isbn" UNIQUE ("isbn")
        `);

        // Add index for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_books_isbn"
            ON "books" ("isbn")
            WHERE "isbn" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_books_isbn"`);

        // Drop unique constraint
        await queryRunner.query(`
            ALTER TABLE "books"
            DROP CONSTRAINT IF EXISTS "UQ_books_isbn"
        `);
    }
}
