import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/shared/src/database/migrationColumns';
import { PackmindLogger } from '@packmind/logger';

const origin = 'UpdateRecipesAddRecipeVersions1751616237713';

export class UpdateRecipesAddRecipeVersions1751616237713
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

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
        type: 'varchar',
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
    this.logger.info('Starting migration: UpdateRecipesAddRecipeVersions');

    try {
      // Create the recipe_versions table
      this.logger.debug('Creating recipe_versions table');
      await queryRunner.createTable(this.recipeVersionsTable);
      this.logger.info('Successfully created recipe_versions table');

      // Add foreign key
      this.logger.debug(
        'Adding foreign key constraint between recipe_versions and recipes',
      );
      await queryRunner.createForeignKey('recipe_versions', this.foreignKey);
      this.logger.info('Successfully added foreign key constraint');

      // Drop name and content columns from recipes table
      this.logger.debug('Dropping name column from recipes table');
      await queryRunner.dropColumn('recipes', 'name');
      this.logger.debug('Successfully dropped name column');

      this.logger.debug('Dropping content column from recipes table');
      await queryRunner.dropColumn('recipes', 'content');
      this.logger.debug('Successfully dropped content column');

      this.logger.info(
        'Migration UpdateRecipesAddRecipeVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdateRecipesAddRecipeVersions failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: UpdateRecipesAddRecipeVersions');

    try {
      // Drop foreign key
      this.logger.debug(
        'Dropping foreign key constraint between recipe_versions and recipes',
      );
      await queryRunner.dropForeignKey('recipe_versions', this.foreignKey);
      this.logger.info('Successfully dropped foreign key constraint');

      // Drop the recipe_versions table
      this.logger.debug('Dropping recipe_versions table');
      await queryRunner.dropTable(this.recipeVersionsTable);
      this.logger.info('Successfully dropped recipe_versions table');

      // Add back name and content columns to recipes table
      this.logger.debug('Adding back name column to recipes table');
      await queryRunner.addColumn(
        'recipes',
        new TableColumn({
          name: 'name',
          type: 'varchar',
        }),
      );
      this.logger.debug('Successfully added back name column');

      this.logger.debug('Adding back content column to recipes table');
      await queryRunner.addColumn(
        'recipes',
        new TableColumn({
          name: 'content',
          type: 'text',
        }),
      );
      this.logger.debug('Successfully added back content column');

      this.logger.info(
        'Rollback UpdateRecipesAddRecipeVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback UpdateRecipesAddRecipeVersions failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
