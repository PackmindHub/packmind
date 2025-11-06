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
} from '@packmind/shared/src/database/migrationColumns';

const origin = 'AddPasswordResetTokens1759240072004';

export class AddPasswordResetTokens1759240072004 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly passwordResetTokensTable = new Table({
    name: 'password_reset_tokens',
    columns: [
      uuidMigrationColumn,
      {
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'token',
        type: 'varchar',
        length: '512',
        isNullable: false,
        isUnique: true,
      },
      {
        name: 'expiration_date',
        type: 'timestamptz',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly passwordResetTokenUserForeignKey = new TableForeignKey({
    name: 'FK_password_reset_tokens_user',
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly passwordResetTokenUserIndex = new TableIndex({
    name: 'IDX_password_reset_tokens_user_id',
    columnNames: ['user_id'],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddPasswordResetTokens');

    try {
      this.logger.debug('Creating password_reset_tokens table');
      await queryRunner.createTable(this.passwordResetTokensTable, true);
      this.logger.info('Successfully created password_reset_tokens table');

      this.logger.debug('Adding foreign key constraint to users table');
      await queryRunner.createForeignKey(
        'password_reset_tokens',
        this.passwordResetTokenUserForeignKey,
      );
      this.logger.info('Successfully added foreign key constraint');

      this.logger.debug('Adding index on user_id column');
      await queryRunner.createIndex(
        'password_reset_tokens',
        this.passwordResetTokenUserIndex,
      );
      this.logger.info('Successfully added user_id index');

      this.logger.info(
        'Migration AddPasswordResetTokens completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddPasswordResetTokens failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddPasswordResetTokens');

    try {
      this.logger.debug('Dropping user_id index');
      await queryRunner.dropIndex(
        'password_reset_tokens',
        this.passwordResetTokenUserIndex,
      );
      this.logger.info('Successfully dropped user_id index');

      this.logger.debug('Dropping foreign key constraint');
      await queryRunner.dropForeignKey(
        'password_reset_tokens',
        this.passwordResetTokenUserForeignKey,
      );
      this.logger.info('Successfully dropped foreign key constraint');

      this.logger.debug('Dropping password_reset_tokens table');
      await queryRunner.dropTable('password_reset_tokens', true);
      this.logger.info('Successfully dropped password_reset_tokens table');

      this.logger.info(
        'Rollback AddPasswordResetTokens completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddPasswordResetTokens failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
