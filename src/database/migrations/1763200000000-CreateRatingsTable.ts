import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRatingsTable1763200000000 implements MigrationInterface {
  name = 'CreateRatingsTable1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ratings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "exchange_id" uuid NOT NULL,
        "rater_id" uuid NOT NULL,
        "rated_user_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "review" text,
        "is_visible" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ratings_exchange_rater_rated" UNIQUE ("exchange_id", "rater_id", "rated_user_id"),
        CONSTRAINT "PK_ratings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "ratings" ADD CONSTRAINT "FK_ratings_exchange" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings" ADD CONSTRAINT "FK_ratings_rater" FOREIGN KEY ("rater_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings" ADD CONSTRAINT "FK_ratings_rated_user" FOREIGN KEY ("rated_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_rated_user"`);
    await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_rater"`);
    await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_exchange"`);
    await queryRunner.query(`DROP TABLE "ratings"`);
  }
}
