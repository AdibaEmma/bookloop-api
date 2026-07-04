import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSubscriptionsTable1762900000000 implements MigrationInterface {
  name = 'CreateSubscriptionsTable1762900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create subscription_tier enum
    await queryRunner.query(`
      CREATE TYPE "subscription_tier_enum" AS ENUM ('free', 'basic', 'premium')
    `);

    // Create subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'tier',
            type: 'subscription_tier_enum',
            default: `'free'`,
          },
          {
            name: 'starts_at',
            type: 'timestamptz',
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
          },
          {
            name: 'auto_renew',
            type: 'boolean',
            default: false,
          },
          {
            name: 'active_listings_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index on user_id
    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'IDX_subscriptions_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Create index on expires_at
    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'IDX_subscriptions_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_user');

    // Drop indexes
    await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_expires_at');
    await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_user_id');

    // Drop table
    await queryRunner.dropTable('subscriptions');

    // Drop enum
    await queryRunner.query(`DROP TYPE "subscription_tier_enum"`);
  }
}
