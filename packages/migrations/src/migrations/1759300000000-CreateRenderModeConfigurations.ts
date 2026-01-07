import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateRenderModeConfigurations1759300000000';

export class CreateRenderModeConfigurations1759300000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly table = new Table({
    name: 'render_mode_configurations',
    columns: [
      uuidMigrationColumn,
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'active_render_modes',
        type: 'text',
        isArray: true,
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
    indices: [
      {
        name: 'idx_render_mode_configurations_organization',
        columnNames: ['organization_id'],
        isUnique: true,
      },
    ],
  });

  private readonly organizationForeignKey = new TableForeignKey({
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_render_mode_configurations_organization',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateRenderModeConfigurations');

    try {
      this.logger.debug('Creating render_mode_configurations table');
      await queryRunner.createTable(this.table);
      this.logger.info('Created render_mode_configurations table');

      this.logger.debug('Adding foreign key to organizations table');
      await queryRunner.createForeignKey(
        'render_mode_configurations',
        this.organizationForeignKey,
      );
      this.logger.info('Added foreign key to organizations table');

      this.logger.info(
        'Migration CreateRenderModeConfigurations completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateRenderModeConfigurations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateRenderModeConfigurations');

    try {
      this.logger.debug('Dropping foreign key from render_mode_configurations');
      await queryRunner.dropForeignKey(
        'render_mode_configurations',
        this.organizationForeignKey,
      );
      this.logger.info(
        'Dropped foreign key from render_mode_configurations table',
      );

      this.logger.debug('Dropping render_mode_configurations table');
      await queryRunner.dropTable('render_mode_configurations', true);
      this.logger.info('Dropped render_mode_configurations table');

      this.logger.info(
        'Rollback CreateRenderModeConfigurations completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateRenderModeConfigurations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
