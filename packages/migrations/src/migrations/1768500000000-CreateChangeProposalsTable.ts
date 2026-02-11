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

const origin = 'CreateChangeProposalsTable1768500000000';

export class CreateChangeProposalsTable1768500000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly changeProposalsTable = new Table({
    name: 'change_proposals',
    columns: [
      uuidMigrationColumn,
      {
        name: 'type',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'artefact_id',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'artefact_version',
        type: 'int',
        isNullable: false,
      },
      {
        name: 'space_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'payload',
        type: 'jsonb',
        isNullable: false,
      },
      {
        name: 'capture_mode',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'status',
        type: 'varchar',
        isNullable: false,
        default: "'pending'",
      },
      {
        name: 'created_by',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'resolved_by',
        type: 'uuid',
        isNullable: true,
      },
      {
        name: 'resolved_at',
        type: 'timestamp with time zone',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly spaceForeignKey = new TableForeignKey({
    name: 'FK_change_proposals_space',
    columnNames: ['space_id'],
    referencedTableName: 'spaces',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly artefactIdIndex = new TableIndex({
    name: 'IDX_change_proposals_artefact_id',
    columnNames: ['artefact_id'],
  });

  private readonly spaceIdIndex = new TableIndex({
    name: 'IDX_change_proposals_space_id',
    columnNames: ['space_id'],
  });

  private readonly statusIndex = new TableIndex({
    name: 'IDX_change_proposals_status',
    columnNames: ['status'],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateChangeProposalsTable');

    try {
      this.logger.debug('Creating change_proposals table');
      await queryRunner.createTable(this.changeProposalsTable, true);

      this.logger.debug(
        'Adding foreign key change_proposals.space_id -> spaces.id',
      );
      await queryRunner.createForeignKey(
        'change_proposals',
        this.spaceForeignKey,
      );

      this.logger.debug('Creating index on change_proposals.artefact_id');
      await queryRunner.createIndex('change_proposals', this.artefactIdIndex);

      this.logger.debug('Creating index on change_proposals.space_id');
      await queryRunner.createIndex('change_proposals', this.spaceIdIndex);

      this.logger.debug('Creating index on change_proposals.status');
      await queryRunner.createIndex('change_proposals', this.statusIndex);

      this.logger.info(
        'Migration CreateChangeProposalsTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateChangeProposalsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateChangeProposalsTable');

    try {
      this.logger.debug('Dropping index on change_proposals.status');
      await queryRunner.dropIndex('change_proposals', this.statusIndex);

      this.logger.debug('Dropping index on change_proposals.space_id');
      await queryRunner.dropIndex('change_proposals', this.spaceIdIndex);

      this.logger.debug('Dropping index on change_proposals.artefact_id');
      await queryRunner.dropIndex('change_proposals', this.artefactIdIndex);

      this.logger.debug(
        'Dropping foreign key change_proposals.space_id -> spaces.id',
      );
      await queryRunner.dropForeignKey(
        'change_proposals',
        this.spaceForeignKey,
      );

      this.logger.debug('Dropping change_proposals table');
      await queryRunner.dropTable('change_proposals');

      this.logger.info(
        'Rollback CreateChangeProposalsTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateChangeProposalsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
