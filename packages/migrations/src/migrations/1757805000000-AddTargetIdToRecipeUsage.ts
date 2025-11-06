import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddTargetIdToRecipeUsage1757805000000';

export class AddTargetIdToRecipeUsage1757805000000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly foreignKey = new TableForeignKey({
    columnNames: ['target_id'],
    referencedTableName: 'targets',
    referencedColumnNames: ['id'],
    onDelete: 'SET NULL',
    name: 'FK_recipe_usage_target',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddTargetIdToRecipeUsage');

    try {
      // Check if target_id column already exists
      const columnExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_usage' 
          AND column_name = 'target_id'
      `);

      if (columnExists.length === 0) {
        this.logger.debug('Adding target_id column to recipe_usage table');
        await queryRunner.query(`
          ALTER TABLE "recipe_usage" 
          ADD COLUMN "target_id" uuid NULL
        `);
        this.logger.info('Successfully added target_id column');
      } else {
        this.logger.info(
          'target_id column already exists, skipping column creation',
        );
      }

      // Check if foreign key already exists
      const foreignKeyExists = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'recipe_usage' 
          AND constraint_name = 'FK_recipe_usage_target'
      `);

      if (foreignKeyExists.length === 0) {
        this.logger.debug(
          'Adding foreign key constraint FK_recipe_usage_target to recipe_usage table',
        );
        await queryRunner.createForeignKey('recipe_usage', this.foreignKey);
        this.logger.info('Successfully added foreign key constraint');
      } else {
        this.logger.info(
          'Foreign key constraint already exists, skipping constraint creation',
        );
      }

      this.logger.info(
        'Migration AddTargetIdToRecipeUsage completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddTargetIdToRecipeUsage failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddTargetIdToRecipeUsage');

    try {
      // Check if foreign key exists before trying to drop it
      const foreignKeyExists = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'recipe_usage' 
          AND constraint_name = 'FK_recipe_usage_target'
      `);

      if (foreignKeyExists.length > 0) {
        this.logger.debug(
          'Dropping foreign key constraint FK_recipe_usage_target',
        );
        await queryRunner.dropForeignKey('recipe_usage', this.foreignKey);
        this.logger.info('Successfully dropped foreign key constraint');
      } else {
        this.logger.info(
          'Foreign key constraint does not exist, skipping constraint removal',
        );
      }

      // Check if column exists before trying to drop it
      const columnExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_usage' 
          AND column_name = 'target_id'
      `);

      if (columnExists.length > 0) {
        this.logger.debug('Dropping target_id column from recipe_usage table');
        await queryRunner.query(`
          ALTER TABLE "recipe_usage" 
          DROP COLUMN "target_id"
        `);
        this.logger.info('Successfully dropped target_id column');
      } else {
        this.logger.info(
          'target_id column does not exist, skipping column removal',
        );
      }

      this.logger.info(
        'Rollback AddTargetIdToRecipeUsage completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddTargetIdToRecipeUsage failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
