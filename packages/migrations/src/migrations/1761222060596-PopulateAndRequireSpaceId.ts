import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'PopulateAndRequireSpaceId1761222060596';

export class PopulateAndRequireSpaceId1761222060596 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: PopulateAndRequireSpaceId');

    try {
      // Step 1: Find all organizations and their Global spaces
      this.logger.debug('Finding all organizations and their Global spaces');
      const organizationsWithSpaces = await queryRunner.query(`
        SELECT o.id as organization_id, s.id as space_id
        FROM organizations o
        INNER JOIN spaces s ON s.organization_id = o.id
        WHERE s.slug = 'global' 
      `);

      this.logger.info(
        `Found ${organizationsWithSpaces.length} organizations with Global spaces`,
      );

      if (organizationsWithSpaces.length === 0) {
        this.logger.info('No organizations found, skipping spaceId population');
      } else {
        // Step 2: Update standards with NULL space_id
        this.logger.debug('Updating standards with NULL space_id');
        for (const org of organizationsWithSpaces) {
          const result = await queryRunner.query(
            `
            UPDATE standards 
            SET space_id = $1 
            WHERE organization_id = $2 
            AND space_id IS NULL
          `,
            [org.space_id, org.organization_id],
          );

          this.logger.debug(
            `Updated ${result[1]} standards for organization ${org.organization_id}`,
          );
        }

        // Step 3: Update recipes with NULL space_id
        this.logger.debug('Updating recipes with NULL space_id');
        for (const org of organizationsWithSpaces) {
          const result = await queryRunner.query(
            `
            UPDATE recipes 
            SET space_id = $1 
            WHERE organization_id = $2 
            AND space_id IS NULL
          `,
            [org.space_id, org.organization_id],
          );

          this.logger.debug(
            `Updated ${result[1]} recipes for organization ${org.organization_id}`,
          );
        }
      }

      // Step 4: Make space_id NOT NULL for standards
      this.logger.debug('Making space_id NOT NULL for standards table');
      await queryRunner.query(`
        ALTER TABLE standards 
        ALTER COLUMN space_id SET NOT NULL
      `);
      this.logger.info(
        'Successfully made space_id NOT NULL for standards table',
      );

      // Step 5: Make space_id NOT NULL for recipes
      this.logger.debug('Making space_id NOT NULL for recipes table');
      await queryRunner.query(`
        ALTER TABLE recipes 
        ALTER COLUMN space_id SET NOT NULL
      `);
      this.logger.info('Successfully made space_id NOT NULL for recipes table');

      this.logger.info(
        'Migration PopulateAndRequireSpaceId completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration PopulateAndRequireSpaceId failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: PopulateAndRequireSpaceId');

    try {
      // Step 1: Make space_id nullable for standards
      this.logger.debug('Making space_id nullable for standards table');
      await queryRunner.query(`
        ALTER TABLE standards 
        ALTER COLUMN space_id DROP NOT NULL
      `);
      this.logger.info(
        'Successfully made space_id nullable for standards table',
      );

      // Step 2: Make space_id nullable for recipes
      this.logger.debug('Making space_id nullable for recipes table');
      await queryRunner.query(`
        ALTER TABLE recipes 
        ALTER COLUMN space_id DROP NOT NULL
      `);
      this.logger.info('Successfully made space_id nullable for recipes table');

      this.logger.info(
        'Rollback PopulateAndRequireSpaceId completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback PopulateAndRequireSpaceId failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
