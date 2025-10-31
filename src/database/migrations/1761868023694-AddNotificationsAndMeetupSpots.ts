import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddNotificationsAndMeetupSpots1761868023694 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create notifications table
        await queryRunner.createTable(
            new Table({
                name: 'notifications',
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
                        isNullable: false,
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        comment: 'Type of notification: exchange_request, exchange_accepted, exchange_declined, exchange_completed, new_listing, message, etc.',
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'message',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'data',
                        type: 'jsonb',
                        isNullable: true,
                        comment: 'Additional data for the notification (exchange_id, listing_id, etc.)',
                    },
                    {
                        name: 'is_read',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'read_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create index on user_id and is_read for efficient queries
        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_USER_READ',
                columnNames: ['user_id', 'is_read'],
            }),
        );

        // Create index on created_at for sorting
        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_CREATED_AT',
                columnNames: ['created_at'],
            }),
        );

        // Create meetup_spots table
        await queryRunner.createTable(
            new Table({
                name: 'meetup_spots',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'address',
                        type: 'varchar',
                        length: '500',
                        isNullable: false,
                    },
                    {
                        name: 'city',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'region',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                        comment: 'Region/State (e.g., Greater Accra Region)',
                    },
                    {
                        name: 'location',
                        type: 'geography',
                        spatialFeatureType: 'Point',
                        srid: 4326,
                        isNullable: false,
                    },
                    {
                        name: 'category',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                        comment: 'Category: mall, library, cafe, park, etc.',
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );

        // Create spatial index for location-based queries
        await queryRunner.query(
            `CREATE INDEX "IDX_MEETUP_SPOTS_LOCATION" ON "meetup_spots" USING GIST ("location")`,
        );

        // Create index on city for filtering
        await queryRunner.createIndex(
            'meetup_spots',
            new TableIndex({
                name: 'IDX_MEETUP_SPOTS_CITY',
                columnNames: ['city'],
            }),
        );

        // Insert seed data for Accra meetup spots
        await queryRunner.query(`
            INSERT INTO meetup_spots (name, description, address, city, region, location, category) VALUES
            ('Accra Mall', 'Main entrance near food court', 'Tetteh Quarshie Interchange, Accra', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.1870, 5.6037), 4326), 'mall'),
            ('Legon Campus Library', 'University of Ghana main library entrance', 'University of Ghana, Legon', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.1837, 5.6519), 4326), 'library'),
            ('Silverbird Cinemas - Accra Mall', 'Cinema lobby area', 'Accra Mall, Tetteh Quarshie', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.1875, 5.6041), 4326), 'mall'),
            ('Ridge Park', 'Near the fountain', 'Ridge, Accra', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.2058, 5.5777), 4326), 'park'),
            ('Marina Mall', 'Ground floor entrance', 'Airport City, Accra', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.1684, 5.6050), 4326), 'mall'),
            ('Kofi Annan ICT Centre', 'Main reception area', 'Accra Central', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.2067, 5.5600), 4326), 'library'),
            ('Oxford Street Starbucks', 'Coffee shop seating area', 'Oxford Street, Osu', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.1728, 5.5557), 4326), 'cafe'),
            ('West Hills Mall', 'Main entrance lobby', 'Weija, Accra', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.3228, 5.5814), 4326), 'mall'),
            ('Independence Square', 'Near Independence Arch', 'High Street, Accra', 'Accra', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(-0.2000, 5.5389), 4326), 'park'),
            ('Tema Community Library', 'Main entrance', 'Community 1, Tema', 'Tema', 'Greater Accra Region', ST_SetSRID(ST_MakePoint(0.0167, 5.6500), 4326), 'library')
        `);

        // Add meetup_location_id to exchanges table
        await queryRunner.query(`
            ALTER TABLE exchanges
            ADD COLUMN meetup_location_id uuid,
            ADD CONSTRAINT fk_exchanges_meetup_location
            FOREIGN KEY (meetup_location_id)
            REFERENCES meetup_spots(id)
            ON DELETE SET NULL
        `);

        // Create user_devices table for FCM tokens
        await queryRunner.createTable(
            new Table({
                name: 'user_devices',
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
                        isNullable: false,
                    },
                    {
                        name: 'device_token',
                        type: 'varchar',
                        length: '500',
                        isNullable: false,
                        isUnique: true,
                    },
                    {
                        name: 'device_type',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                        comment: 'ios, android, web',
                    },
                    {
                        name: 'device_name',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'last_used_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create index on user_id for user_devices
        await queryRunner.createIndex(
            'user_devices',
            new TableIndex({
                name: 'IDX_USER_DEVICES_USER_ID',
                columnNames: ['user_id'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key and column from exchanges table
        await queryRunner.query(`
            ALTER TABLE exchanges
            DROP CONSTRAINT IF EXISTS fk_exchanges_meetup_location,
            DROP COLUMN IF EXISTS meetup_location_id
        `);

        // Drop user_devices table
        await queryRunner.dropTable('user_devices', true);

        // Drop meetup_spots table
        await queryRunner.dropTable('meetup_spots', true);

        // Drop notifications table
        await queryRunner.dropTable('notifications', true);
    }

}
