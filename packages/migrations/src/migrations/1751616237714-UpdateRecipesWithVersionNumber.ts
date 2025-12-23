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

const origin = 'UpdateRecipesWithVersionNumber1751616237714';

export class UpdateRecipesWithVersionNumber1751616237714 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly recipesTable = new Table({
    name: 'recipes',
    columns: [
      uuidMigrationColumn,
      {
        name: 'name',
        type: 'varchar',
      },
      {
        name: 'slug',
        type: 'varchar',
      },
      {
        name: 'content',
        type: 'text',
      },
      {
        name: 'version',
        type: 'int',
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly recipeVersionsTable = new Table({
    name: 'recipe_versions',
    columns: [
      uuidMigrationColumn,
      {
        name: 'recipeId',
        type: 'uuid',
      },
      {
        name: 'name',
        type: 'varchar',
      },
      {
        name: 'slug',
        type: 'varchar',
      },
      {
        name: 'content',
        type: 'text',
      },
      {
        name: 'version',
        type: 'int',
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly foreignKey = new TableForeignKey({
    columnNames: ['recipeId'],
    referencedColumnNames: ['id'],
    referencedTableName: 'recipes',
    onDelete: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: UpdateRecipesWithVersionNumber');

    try {
      // Drop existing tables if they exist
      this.logger.debug('Dropping existing recipe_versions table if it exists');
      await queryRunner.dropTable('recipe_versions', true);
      this.logger.debug('Successfully dropped recipe_versions table');

      this.logger.debug('Dropping existing recipes table if it exists');
      await queryRunner.dropTable('recipes', true);
      this.logger.debug('Successfully dropped recipes table');

      // Create new tables with updated schema
      this.logger.debug('Creating new recipes table with updated schema');
      await queryRunner.createTable(this.recipesTable);
      this.logger.info('Successfully created recipes table');

      this.logger.debug(
        'Creating new recipe_versions table with updated schema',
      );
      await queryRunner.createTable(this.recipeVersionsTable);
      this.logger.info('Successfully created recipe_versions table');

      // Add foreign key
      this.logger.debug(
        'Adding foreign key constraint between recipe_versions and recipes',
      );
      await queryRunner.createForeignKey('recipe_versions', this.foreignKey);
      this.logger.info('Successfully added foreign key constraint');

      this.logger.info(
        'Migration UpdateRecipesWithVersionNumber completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdateRecipesWithVersionNumber failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: UpdateRecipesWithVersionNumber');

    try {
      // Drop foreign key
      this.logger.debug(
        'Dropping foreign key constraint between recipe_versions and recipes',
      );
      await queryRunner.dropForeignKey('recipe_versions', this.foreignKey);
      this.logger.info('Successfully dropped foreign key constraint');

      // Drop tables
      this.logger.debug('Dropping recipe_versions table');
      await queryRunner.dropTable(this.recipeVersionsTable);
      this.logger.info('Successfully dropped recipe_versions table');

      this.logger.debug('Dropping recipes table');
      await queryRunner.dropTable(this.recipesTable);
      this.logger.info('Successfully dropped recipes table');

      this.logger.info(
        'Rollback UpdateRecipesWithVersionNumber completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback UpdateRecipesWithVersionNumber failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
