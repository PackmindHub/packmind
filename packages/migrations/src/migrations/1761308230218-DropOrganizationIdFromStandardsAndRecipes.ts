import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'DropOrganizationIdFromStandardsAndRecipes1761308230218';

export class DropOrganizationIdFromStandardsAndRecipes1761308230218
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: DropOrganizationIdFromStandardsAndRecipes',
    );

    try {
      // Drop indices first (before dropping columns they reference)
      this.logger.debug('Dropping indices from standards table');
      await queryRunner.query(`DROP INDEX IF EXISTS idx_standard_organization`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_standard_org_user`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_standard_slug`);

      this.logger.debug('Dropping indices from recipes table');
      await queryRunner.query(`DROP INDEX IF EXISTS idx_recipe_organization`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_recipe_org_user`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_recipe_slug`);

      // Drop organization_id columns
      this.logger.debug('Dropping organization_id column from standards table');
      await queryRunner.query(
        `ALTER TABLE standards DROP COLUMN organization_id`,
      );

      this.logger.debug('Dropping organization_id column from recipes table');
      await queryRunner.query(
        `ALTER TABLE recipes DROP COLUMN organization_id`,
      );

      this.logger.info(
        'Migration DropOrganizationIdFromStandardsAndRecipes completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration DropOrganizationIdFromStandardsAndRecipes failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: DropOrganizationIdFromStandardsAndRecipes',
    );

    try {
      // Recreate organization_id columns (as nullable since we don't have the data)
      this.logger.debug('Recreating organization_id column in standards table');
      await queryRunner.query(`
        ALTER TABLE standards 
        ADD COLUMN organization_id uuid NULL
      `);

      this.logger.debug('Recreating organization_id column in recipes table');
      await queryRunner.query(`
        ALTER TABLE recipes 
        ADD COLUMN organization_id uuid NULL
      `);

      // Recreate indices
      this.logger.debug('Recreating indices on standards table');
      await queryRunner.query(`
        CREATE INDEX idx_standard_organization ON standards(organization_id)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_standard_org_user ON standards(organization_id, user_id)
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX idx_standard_slug ON standards(slug, organization_id) 
        WHERE deleted_at IS NULL
      `);

      this.logger.debug('Recreating indices on recipes table');
      await queryRunner.query(`
        CREATE INDEX idx_recipe_organization ON recipes(organization_id)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_recipe_org_user ON recipes(organization_id, user_id)
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX idx_recipe_slug ON recipes(slug, organization_id) 
        WHERE deleted_at IS NULL
      `);

      this.logger.info(
        'Rollback DropOrganizationIdFromStandardsAndRecipes completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback DropOrganizationIdFromStandardsAndRecipes failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
