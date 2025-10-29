import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddSpaceIdToRecipes1761136181330';

export class AddSpaceIdToRecipes1761136181330 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly spaceIdColumn = new TableColumn({
    name: 'space_id',
    type: 'uuid',
    isNullable: true,
  });

  private readonly recipeSpaceForeignKey = new TableForeignKey({
    name: 'FK_recipe_space',
    columnNames: ['space_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'spaces',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSpaceIdToRecipes');

    try {
      this.logger.debug('Adding space_id column to recipes table');
      await queryRunner.addColumn('recipes', this.spaceIdColumn);
      this.logger.info('Successfully added space_id column to recipes table');

      this.logger.debug('Adding foreign key to recipes table');
      await queryRunner.createForeignKey('recipes', this.recipeSpaceForeignKey);
      this.logger.info('Successfully added foreign key to recipes table');

      this.logger.debug('Creating index on recipes.space_id');
      await queryRunner.query(
        'CREATE INDEX "idx_recipe_space" ON "recipes" ("space_id")',
      );
      this.logger.info('Successfully created index on recipes.space_id');

      this.logger.info('Migration AddSpaceIdToRecipes completed successfully');
    } catch (error) {
      this.logger.error('Migration AddSpaceIdToRecipes failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSpaceIdToRecipes');

    try {
      this.logger.debug('Dropping index from recipes table');
      await queryRunner.query('DROP INDEX "idx_recipe_space"');
      this.logger.info('Successfully dropped index from recipes table');

      this.logger.debug('Dropping foreign key from recipes table');
      await queryRunner.dropForeignKey('recipes', this.recipeSpaceForeignKey);
      this.logger.info('Successfully dropped foreign key from recipes table');

      this.logger.debug('Dropping space_id column from recipes table');
      await queryRunner.dropColumn('recipes', this.spaceIdColumn);
      this.logger.info(
        'Successfully dropped space_id column from recipes table',
      );

      this.logger.info('Rollback AddSpaceIdToRecipes completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddSpaceIdToRecipes failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
