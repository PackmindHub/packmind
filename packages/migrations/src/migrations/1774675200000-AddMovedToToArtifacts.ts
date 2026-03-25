import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddMovedToToArtifacts1774675200000';

const tables = ['skills', 'standards', 'recipes'] as const;

const movedToColumn = new TableColumn({
  name: 'moved_to',
  type: 'uuid',
  isNullable: true,
});

function movedToForeignKey(table: string): TableForeignKey {
  return new TableForeignKey({
    name: `FK_${table}_moved_to_space`,
    columnNames: ['moved_to'],
    referencedColumnNames: ['id'],
    referencedTableName: 'spaces',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
}

export class AddMovedToToArtifacts1774675200000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddMovedToToArtifacts');

    try {
      for (const table of tables) {
        this.logger.debug(`Adding moved_to column to ${table} table`);
        await queryRunner.addColumn(table, movedToColumn);

        this.logger.debug(`Adding foreign key to ${table} table`);
        await queryRunner.createForeignKey(table, movedToForeignKey(table));

        this.logger.info(
          `Successfully added moved_to column and FK to ${table} table`,
        );
      }

      this.logger.info(
        'Migration AddMovedToToArtifacts completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddMovedToToArtifacts failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddMovedToToArtifacts');

    try {
      for (const table of [...tables].reverse()) {
        this.logger.debug(`Dropping foreign key from ${table} table`);
        await queryRunner.dropForeignKey(table, movedToForeignKey(table));

        this.logger.debug(`Dropping moved_to column from ${table} table`);
        await queryRunner.dropColumn(table, movedToColumn);

        this.logger.info(
          `Successfully dropped moved_to column and FK from ${table} table`,
        );
      }

      this.logger.info('Rollback AddMovedToToArtifacts completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddMovedToToArtifacts failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
