import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePaymentsTable1763100000000 implements MigrationInterface {
  name = 'CreatePaymentsTable1763100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums (names match TypeORM's `{table}_{column}_enum` convention).
    await queryRunner.query(
      `CREATE TYPE "payments_purpose_enum" AS ENUM ('subscription', 'exchange', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payments_method_enum" AS ENUM ('card', 'momo', 'both')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payments_status_enum" AS ENUM ('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payments_provider_enum" AS ENUM ('paystack', 'hubtel')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'exchange_id', type: 'uuid', isNullable: true },
          { name: 'subscription_id', type: 'uuid', isNullable: true },
          { name: 'purpose', type: 'payments_purpose_enum', default: `'subscription'` },
          { name: 'amount', type: 'decimal', precision: 10, scale: 2 },
          { name: 'method', type: 'payments_method_enum' },
          { name: 'status', type: 'payments_status_enum', default: `'pending'` },
          { name: 'reference', type: 'varchar', length: '255', isUnique: true },
          { name: 'provider', type: 'payments_provider_enum' },
          { name: 'provider_reference', type: 'varchar', length: '255', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'failure_reason', type: 'text', isNullable: true },
          { name: 'verified_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'IDX_payments_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'IDX_payments_exchange_id', columnNames: ['exchange_id'] }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'IDX_payments_subscription_id', columnNames: ['subscription_id'] }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'IDX_payments_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'IDX_payments_created_at', columnNames: ['created_at'] }),
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'FK_payments_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'FK_payments_exchange',
        columnNames: ['exchange_id'],
        referencedTableName: 'exchanges',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('payments', 'FK_payments_exchange');
    await queryRunner.dropForeignKey('payments', 'FK_payments_user');

    await queryRunner.dropIndex('payments', 'IDX_payments_created_at');
    await queryRunner.dropIndex('payments', 'IDX_payments_status');
    await queryRunner.dropIndex('payments', 'IDX_payments_subscription_id');
    await queryRunner.dropIndex('payments', 'IDX_payments_exchange_id');
    await queryRunner.dropIndex('payments', 'IDX_payments_user_id');

    await queryRunner.dropTable('payments');

    await queryRunner.query(`DROP TYPE "payments_provider_enum"`);
    await queryRunner.query(`DROP TYPE "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "payments_method_enum"`);
    await queryRunner.query(`DROP TYPE "payments_purpose_enum"`);
  }
}
