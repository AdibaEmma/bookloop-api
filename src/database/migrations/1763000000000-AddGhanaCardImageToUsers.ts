import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGhanaCardImageToUsers1763000000000
  implements MigrationInterface
{
  name = 'AddGhanaCardImageToUsers1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'ghana_card_image',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'ghana_card_image');
  }
}
