import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/node-utils';

const origin = 'CreateCliLoginCodes1764687012120';

export class CreateCliLoginCodes1764687012120 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly cliLoginCodesTable = new Table({
    name: 'cli_login_codes',
    columns: [
      uuidMigrationColumn,
      {
        name: 'code',
        type: 'varchar',
        length: '512',
        isNullable: false,
        isUnique: true,
      },
      {
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'expires_at',
        type: 'timestamptz',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly userForeignKey = new TableForeignKey({
    name: 'FK_cli_login_codes_user',
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly organizationForeignKey = new TableForeignKey({
    name: 'FK_cli_login_codes_organization',
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly userIndex = new TableIndex({
    name: 'IDX_cli_login_codes_user_id',
    columnNames: ['user_id'],
  });

  private readonly organizationIndex = new TableIndex({
    name: 'IDX_cli_login_codes_organization_id',
    columnNames: ['organization_id'],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateCliLoginCodes');

    try {
      this.logger.debug('Creating cli_login_codes table');
      await queryRunner.createTable(this.cliLoginCodesTable, true);

      this.logger.debug(
        'Adding foreign key cli_login_codes.user_id -> users.id',
      );
      await queryRunner.createForeignKey(
        'cli_login_codes',
        this.userForeignKey,
      );

      this.logger.debug(
        'Adding foreign key cli_login_codes.organization_id -> organizations.id',
      );
      await queryRunner.createForeignKey(
        'cli_login_codes',
        this.organizationForeignKey,
      );

      this.logger.debug('Creating index on cli_login_codes.user_id');
      await queryRunner.createIndex('cli_login_codes', this.userIndex);

      this.logger.debug('Creating index on cli_login_codes.organization_id');
      await queryRunner.createIndex('cli_login_codes', this.organizationIndex);

      this.logger.info('Migration CreateCliLoginCodes completed successfully');
    } catch (error) {
      this.logger.error('Migration CreateCliLoginCodes failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateCliLoginCodes');

    try {
      this.logger.debug('Dropping index on cli_login_codes.organization_id');
      await queryRunner.dropIndex('cli_login_codes', this.organizationIndex);

      this.logger.debug('Dropping index on cli_login_codes.user_id');
      await queryRunner.dropIndex('cli_login_codes', this.userIndex);

      this.logger.debug(
        'Dropping foreign key cli_login_codes.organization_id -> organizations.id',
      );
      await queryRunner.dropForeignKey(
        'cli_login_codes',
        this.organizationForeignKey,
      );

      this.logger.debug(
        'Dropping foreign key cli_login_codes.user_id -> users.id',
      );
      await queryRunner.dropForeignKey('cli_login_codes', this.userForeignKey);

      this.logger.debug('Dropping cli_login_codes table');
      await queryRunner.dropTable('cli_login_codes');

      this.logger.info('Rollback CreateCliLoginCodes completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreateCliLoginCodes failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
