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

const origin = 'CreateTrialActivations1765894658878';

export class CreateTrialActivations1765894658878 implements MigrationInterface {
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
    this.logger.info('Starting migration: CreateTrialActivations');

    try {
      this.logger.debug('Creating trial_activations table');
      await queryRunner.createTable(this.trialActivationsTable, true);

      this.logger.debug(
        'Adding foreign key trial_activations.user_id -> users.id',
      );
      await queryRunner.createForeignKey(
        'trial_activations',
        this.trialActivationUserForeignKey,
      );

      this.logger.debug('Creating index on trial_activations.user_id');
      await queryRunner.createIndex(
        'trial_activations',
        this.trialActivationUserIndex,
      );

      this.logger.info('Migration CreateTrialActivations completed');
    } catch (error) {
      this.logger.error('Migration CreateTrialActivations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateTrialActivations');

    try {
      this.logger.debug('Dropping index on trial_activations.user_id');
      await queryRunner.dropIndex(
        'trial_activations',
        this.trialActivationUserIndex,
      );

      this.logger.debug(
        'Dropping foreign key trial_activations.user_id -> users.id',
      );
      await queryRunner.dropForeignKey(
        'trial_activations',
        this.trialActivationUserForeignKey,
      );

      this.logger.debug('Dropping trial_activations table');
      await queryRunner.dropTable('trial_activations');

      this.logger.info('Rollback CreateTrialActivations completed');
    } catch (error) {
      this.logger.error('Rollback CreateTrialActivations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
