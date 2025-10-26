import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1761520039289 implements MigrationInterface {
    name = 'InitialSchema1761520039289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_subscription_tier_enum" AS ENUM('free', 'basic', 'premium')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying(50) NOT NULL, "middle_name" character varying(50), "last_name" character varying(50) NOT NULL, "phone_number" character varying(15) NOT NULL, "phone_verified" boolean NOT NULL DEFAULT false, "email" character varying(255), "email_verified" boolean NOT NULL DEFAULT false, "profile_picture" character varying(255), "bio" text, "location" geography(Point,4326), "address" character varying(255), "city" character varying(100), "region" character varying(100), "country" character varying(100) NOT NULL DEFAULT 'Ghana', "ghana_card_number" character varying(20), "ghana_card_verified" boolean NOT NULL DEFAULT false, "ghana_card_verified_at" TIMESTAMP, "subscription_tier" "public"."users_subscription_tier_enum" NOT NULL DEFAULT 'free', "subscription_expires_at" TIMESTAMP, "total_exchanges" integer NOT NULL DEFAULT '0', "rating" numeric(3,2) NOT NULL DEFAULT '0', "total_ratings" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "is_banned" boolean NOT NULL DEFAULT false, "last_login_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_17d1817f241f10a3dbafb169fd2" UNIQUE ("phone_number"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "books" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isbn" character varying(13), "title" character varying(255) NOT NULL, "author" character varying(255) NOT NULL, "description" text, "cover_image" character varying(255), "publisher" character varying(100), "publication_year" integer, "language" character varying(50) NOT NULL DEFAULT 'English', "pages" integer, "genre" character varying(100), "categories" text, "google_books_id" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f3f2f25a099d24e12545b70b022" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."listings_listing_type_enum" AS ENUM('exchange', 'donate', 'borrow')`);
        await queryRunner.query(`CREATE TYPE "public"."listings_book_condition_enum" AS ENUM('new', 'like_new', 'good', 'fair', 'poor')`);
        await queryRunner.query(`CREATE TYPE "public"."listings_status_enum" AS ENUM('available', 'reserved', 'exchanged', 'expired', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "book_id" uuid NOT NULL, "listing_type" "public"."listings_listing_type_enum" NOT NULL, "book_condition" "public"."listings_book_condition_enum" NOT NULL, "description" text, "images" text, "location" geography(Point,4326) NOT NULL, "address" character varying(255) NOT NULL, "city" character varying(100) NOT NULL, "region" character varying(100) NOT NULL, "search_radius_km" integer NOT NULL DEFAULT '10', "preferred_genres" text, "status" "public"."listings_status_enum" NOT NULL DEFAULT 'available', "expires_at" TIMESTAMP, "views_count" integer NOT NULL DEFAULT '0', "interest_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_520ecac6c99ec90bcf5a603cdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."exchanges_status_enum" AS ENUM('pending', 'accepted', 'declined', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "exchanges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requester_id" uuid NOT NULL, "owner_id" uuid NOT NULL, "listing_id" uuid NOT NULL, "offered_listing_id" uuid, "status" "public"."exchanges_status_enum" NOT NULL DEFAULT 'pending', "requester_message" text, "owner_response" text, "meetup_location" geography(Point,4326), "meetup_address" character varying(255), "meetup_time" TIMESTAMP, "requester_confirmed_meetup" boolean NOT NULL DEFAULT false, "owner_confirmed_meetup" boolean NOT NULL DEFAULT false, "requester_confirmed_completion" boolean NOT NULL DEFAULT false, "owner_confirmed_completion" boolean NOT NULL DEFAULT false, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_17ccd29473f939c68de98c2cea3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "FK_3f1539dda02eba4738ac5859ded" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "FK_bfaa743974ea8d0a0e42ce6e9e7" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchanges" ADD CONSTRAINT "FK_19f633c951991e5fc170dcbb9ff" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchanges" ADD CONSTRAINT "FK_609c65150d3c090cb88ea8ae633" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchanges" ADD CONSTRAINT "FK_e6506e88a3ee7dae1f69abd7003" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchanges" ADD CONSTRAINT "FK_5fb4b79246bd0f1c4394aa9a798" FOREIGN KEY ("offered_listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exchanges" DROP CONSTRAINT "FK_5fb4b79246bd0f1c4394aa9a798"`);
        await queryRunner.query(`ALTER TABLE "exchanges" DROP CONSTRAINT "FK_e6506e88a3ee7dae1f69abd7003"`);
        await queryRunner.query(`ALTER TABLE "exchanges" DROP CONSTRAINT "FK_609c65150d3c090cb88ea8ae633"`);
        await queryRunner.query(`ALTER TABLE "exchanges" DROP CONSTRAINT "FK_19f633c951991e5fc170dcbb9ff"`);
        await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_bfaa743974ea8d0a0e42ce6e9e7"`);
        await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_3f1539dda02eba4738ac5859ded"`);
        await queryRunner.query(`DROP TABLE "exchanges"`);
        await queryRunner.query(`DROP TYPE "public"."exchanges_status_enum"`);
        await queryRunner.query(`DROP TABLE "listings"`);
        await queryRunner.query(`DROP TYPE "public"."listings_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."listings_book_condition_enum"`);
        await queryRunner.query(`DROP TYPE "public"."listings_listing_type_enum"`);
        await queryRunner.query(`DROP TABLE "books"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_subscription_tier_enum"`);
    }

}
