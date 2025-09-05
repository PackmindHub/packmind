import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/shared/src/database/migrationColumns';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddOrganizationAndUsers1752400000000';

export class AddOrganizationAndUsers1752400000000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly organizationTable = new Table({
    name: 'organizations',
    columns: [
      uuidMigrationColumn,
      {
        name: 'name',
        type: 'varchar',
        length: '255',
        isUnique: true,
      },
      {
        name: 'slug',
        type: 'varchar',
        length: '255',
        isUnique: true,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly userTable = new Table({
    name: 'users',
    columns: [
      uuidMigrationColumn,
      {
        name: 'username',
        type: 'varchar',
        length: '255',
        isUnique: true,
      },
      {
        name: 'passwordHash',
        type: 'varchar',
        length: '255',
      },
      {
        name: 'organizationId',
        type: 'uuid',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly userOrganizationForeignKey = new TableForeignKey({
    name: 'FK_user_organization',
    columnNames: ['organizationId'],
    referencedColumnNames: ['id'],
    referencedTableName: 'organizations',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddOrganizationAndUsers');

    try {
      this.logger.debug('Creating organizations table');
      await queryRunner.createTable(this.organizationTable);
      this.logger.info('Successfully created organizations table');

      this.logger.debug('Creating users table');
      await queryRunner.createTable(this.userTable);
      this.logger.info('Successfully created users table');

      this.logger.debug('Adding foreign key to users table');
      await queryRunner.createForeignKey(
        'users',
        this.userOrganizationForeignKey,
      );
      this.logger.info('Successfully added foreign key to users table');

      this.logger.debug('Creating index on users.organizationId');
      await queryRunner.query(
        'CREATE INDEX "idx_user_organization" ON "users" ("organizationId")',
      );
      this.logger.info('Successfully created index on users.organizationId');

      this.logger.info(
        'Migration AddOrganizationAndUsers completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddOrganizationAndUsers failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddOrganizationAndUsers');

    try {
      this.logger.debug('Dropping index from users table');
      await queryRunner.query('DROP INDEX "idx_user_organization"');
      this.logger.info('Successfully dropped index from users table');

      this.logger.debug('Dropping foreign key from users table');
      await queryRunner.dropForeignKey(
        'users',
        this.userOrganizationForeignKey,
      );
      this.logger.info('Successfully dropped foreign key from users table');

      this.logger.debug('Dropping users table');
      await queryRunner.dropTable(this.userTable);
      this.logger.info('Successfully dropped users table');

      this.logger.debug('Dropping organizations table');
      await queryRunner.dropTable(this.organizationTable);
      this.logger.info('Successfully dropped organizations table');

      this.logger.info(
        'Rollback AddOrganizationAndUsers completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddOrganizationAndUsers failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
