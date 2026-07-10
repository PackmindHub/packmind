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

const origin = 'DropOneClickTrial1812000000000';

/**
 * Removes the "one-click trial" feature schema:
 * - drops the `trial_activations` table (with its index and foreign key)
 * - drops the `users.trial` column
 *
 * The `down` method restores both, mirroring the original
 * AddTrialToUsers and CreateTrialActivations migrations.
 */
export class DropOneClickTrial1812000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly trialActivationsTable = new Table({
    name: 'trial_activations',
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

  private readonly trialActivationUserForeignKey = new TableForeignKey({
    name: 'FK_trial_activations_user',
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly trialActivationUserIndex = new TableIndex({
    name: 'IDX_trial_activations_user_id',
    columnNames: ['user_id'],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropOneClickTrial');

    try {
      this.logger.debug('Dropping trial_activations table');
      await queryRunner.dropTable('trial_activations', true, true, true);

      this.logger.debug('Dropping users.trial column');
      await queryRunner.query(`
        ALTER TABLE "users"
        DROP COLUMN IF EXISTS "trial"
      `);

      this.logger.info('Migration DropOneClickTrial completed');
    } catch (error) {
      this.logger.error('Migration DropOneClickTrial failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: DropOneClickTrial');

    try {
      this.logger.debug('Re-adding users.trial column');
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "trial" boolean NOT NULL DEFAULT false
      `);

      this.logger.debug('Re-creating trial_activations table');
      await queryRunner.createTable(this.trialActivationsTable, true);

      this.logger.debug(
        'Re-adding foreign key trial_activations.user_id -> users.id',
      );
      await queryRunner.createForeignKey(
        'trial_activations',
        this.trialActivationUserForeignKey,
      );

      this.logger.debug('Re-creating index on trial_activations.user_id');
      await queryRunner.createIndex(
        'trial_activations',
        this.trialActivationUserIndex,
      );

      this.logger.info('Rollback DropOneClickTrial completed');
    } catch (error) {
      this.logger.error('Rollback DropOneClickTrial failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
