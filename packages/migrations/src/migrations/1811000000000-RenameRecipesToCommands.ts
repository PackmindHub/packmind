import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'RenameRecipesToCommands1811000000000';

/**
 * Single-cutover physical rename of the recipes -> commands domain.
 *
 * All operations are Postgres catalog-only renames (ALTER ... RENAME), so they
 * are fast and lock-light. No data is copied and no compatibility views are
 * created.
 *
 * Because Postgres does NOT auto-rename indexes or foreign-key constraints when
 * a table is renamed, those are renamed explicitly for naming consistency.
 * (The auto-generated FKs / PKs whose names are opaque hashes are left as-is —
 * their column/table references are updated automatically by Postgres.)
 *
 * Objects covered (all verified to currently exist):
 *   Tables : recipes, recipe_versions, package_recipes,
 *            distributed_package_recipe_versions
 *   Columns: <command_versions>.recipe_id, <package_commands>.recipe_id,
 *            <distributed_package_command_versions>.recipe_version_id
 *   Indexes: idx_recipe_user, idx_recipe_space, idx_package_recipes_unique,
 *            idx_dprv_unique
 *   FKs    : FK_recipe_user, FK_recipe_space, FK_package_recipes_package,
 *            FK_package_recipes_recipe, FK_dprv_recipe_version,
 *            FK_dprv_distributed_package
 */
export class RenameRecipesToCommands1811000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: RenameRecipesToCommands');

    try {
      // 1) Rename tables
      this.logger.debug('Renaming tables recipe* -> command*');
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "recipes" RENAME TO "commands"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "recipe_versions" RENAME TO "command_versions"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_recipes" RENAME TO "package_commands"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_recipe_versions" RENAME TO "distributed_package_command_versions"',
      );

      // 2) Rename columns (referencing the NEW table names)
      this.logger.debug('Renaming recipe_id / recipe_version_id columns');
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "command_versions" RENAME COLUMN "recipe_id" TO "command_id"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_commands" RENAME COLUMN "recipe_id" TO "command_id"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_command_versions" RENAME COLUMN "recipe_version_id" TO "command_version_id"',
      );

      // 3) Rename indexes
      this.logger.debug('Renaming indexes idx_recipe* -> idx_command*');
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_recipe_user" RENAME TO "idx_command_user"',
      );
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_recipe_space" RENAME TO "idx_command_space"',
      );
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_package_recipes_unique" RENAME TO "idx_package_commands_unique"',
      );
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_dprv_unique" RENAME TO "idx_dpcv_unique"',
      );

      // 4) Rename foreign-key constraints (referencing the NEW table names)
      this.logger.debug('Renaming foreign-key constraints');
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "commands" RENAME CONSTRAINT "FK_recipe_user" TO "FK_command_user"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "commands" RENAME CONSTRAINT "FK_recipe_space" TO "FK_command_space"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_commands" RENAME CONSTRAINT "FK_package_recipes_package" TO "FK_package_commands_package"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_commands" RENAME CONSTRAINT "FK_package_recipes_recipe" TO "FK_package_commands_command"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_command_versions" RENAME CONSTRAINT "FK_dprv_recipe_version" TO "FK_dpcv_command_version"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_command_versions" RENAME CONSTRAINT "FK_dprv_distributed_package" TO "FK_dpcv_distributed_package"',
      );

      this.logger.info(
        'Migration RenameRecipesToCommands completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration RenameRecipesToCommands failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: RenameRecipesToCommands');

    try {
      // 4') Restore foreign-key constraint names (tables still named command*)
      this.logger.debug('Restoring foreign-key constraint names');
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_command_versions" RENAME CONSTRAINT "FK_dpcv_distributed_package" TO "FK_dprv_distributed_package"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_command_versions" RENAME CONSTRAINT "FK_dpcv_command_version" TO "FK_dprv_recipe_version"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_commands" RENAME CONSTRAINT "FK_package_commands_command" TO "FK_package_recipes_recipe"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_commands" RENAME CONSTRAINT "FK_package_commands_package" TO "FK_package_recipes_package"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "commands" RENAME CONSTRAINT "FK_command_space" TO "FK_recipe_space"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "commands" RENAME CONSTRAINT "FK_command_user" TO "FK_recipe_user"',
      );

      // 3') Restore index names
      this.logger.debug('Restoring index names');
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_dpcv_unique" RENAME TO "idx_dprv_unique"',
      );
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_package_commands_unique" RENAME TO "idx_package_recipes_unique"',
      );
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_command_space" RENAME TO "idx_recipe_space"',
      );
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "idx_command_user" RENAME TO "idx_recipe_user"',
      );

      // 2') Restore column names (tables still named command*)
      this.logger.debug('Restoring column names');
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_command_versions" RENAME COLUMN "command_version_id" TO "recipe_version_id"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_commands" RENAME COLUMN "command_id" TO "recipe_id"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "command_versions" RENAME COLUMN "command_id" TO "recipe_id"',
      );

      // 1') Restore table names
      this.logger.debug('Restoring table names');
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "distributed_package_command_versions" RENAME TO "distributed_package_recipe_versions"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "package_commands" RENAME TO "package_recipes"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "command_versions" RENAME TO "recipe_versions"',
      );
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "commands" RENAME TO "recipes"',
      );

      this.logger.info(
        'Rollback RenameRecipesToCommands completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback RenameRecipesToCommands failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
