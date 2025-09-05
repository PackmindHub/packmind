import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/shared/src/database/migrationColumns';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddRecipes1751616237712';

export class AddRecipes1751616237712 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly table = new Table({
    name: 'recipes',
    columns: [
      uuidMigrationColumn,
      {
        name: 'name',
        type: 'varchar',
      },
      {
        name: 'content',
        type: 'text',
      },
      ...timestampsMigrationColumns,
    ],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddRecipes');

    try {
      this.logger.debug('Creating recipes table');
      await queryRunner.createTable(this.table);
      this.logger.info('Successfully created recipes table');

      this.logger.info('Migration AddRecipes completed successfully');
    } catch (error) {
      this.logger.error('Migration AddRecipes failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddRecipes');

    try {
      this.logger.debug('Dropping recipes table');
      await queryRunner.dropTable(this.table);
      this.logger.info('Successfully dropped recipes table');

      this.logger.info('Rollback AddRecipes completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddRecipes failed', { error: error.message });
      throw error;
    }
  }
}
