import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddRecipeUsage1752593000000';

export class AddRecipeUsage1752593000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly table = new Table({
    name: 'recipe_usage',
    columns: [
      uuidMigrationColumn,
      {
        name: 'recipeId',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'usedAt',
        type: 'timestamp with time zone',
        isNullable: false,
      },
      {
        name: 'aiAgent',
        type: 'varchar',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly foreignKey = new TableForeignKey({
    columnNames: ['recipeId'],
    referencedTableName: 'recipes',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_recipe_usage_recipe',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddRecipeUsage');

    try {
      this.logger.debug('Creating recipe_usage table');
      await queryRunner.createTable(this.table);
      this.logger.info('Successfully created recipe_usage table');

      this.logger.debug('Adding foreign key constraint to recipe_usage table');
      await queryRunner.createForeignKey('recipe_usage', this.foreignKey);
      this.logger.info('Successfully added foreign key constraint');

      this.logger.info('Migration AddRecipeUsage completed successfully');
    } catch (error) {
      this.logger.error('Migration AddRecipeUsage failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddRecipeUsage');

    try {
      this.logger.debug('Dropping foreign key constraint');
      await queryRunner.dropForeignKey('recipe_usage', this.foreignKey);
      this.logger.info('Successfully dropped foreign key constraint');

      this.logger.debug('Dropping recipe_usage table');
      await queryRunner.dropTable(this.table);
      this.logger.info('Successfully dropped recipe_usage table');

      this.logger.info('Rollback AddRecipeUsage completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddRecipeUsage failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
