import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddAdditionalPropertiesToSkills1774070400000';

export class AddAdditionalPropertiesToSkills1774070400000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddAdditionalPropertiesToSkills');

    try {
      this.logger.debug('Adding additional_properties column to skills table');
      await queryRunner.query(`
        ALTER TABLE "skills"
        ADD COLUMN "additional_properties" jsonb
      `);
      this.logger.info(
        'Successfully added additional_properties column to skills table',
      );

      this.logger.debug(
        'Adding additional_properties column to skill_versions table',
      );
      await queryRunner.query(`
        ALTER TABLE "skill_versions"
        ADD COLUMN "additional_properties" jsonb
      `);
      this.logger.info(
        'Successfully added additional_properties column to skill_versions table',
      );

      this.logger.info(
        'Migration AddAdditionalPropertiesToSkills completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddAdditionalPropertiesToSkills failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddAdditionalPropertiesToSkills');

    try {
      this.logger.debug(
        'Dropping additional_properties column from skill_versions table',
      );
      await queryRunner.query(`
        ALTER TABLE "skill_versions" DROP COLUMN "additional_properties"
      `);
      this.logger.info(
        'Successfully dropped additional_properties column from skill_versions table',
      );

      this.logger.debug(
        'Dropping additional_properties column from skills table',
      );
      await queryRunner.query(`
        ALTER TABLE "skills" DROP COLUMN "additional_properties"
      `);
      this.logger.info(
        'Successfully dropped additional_properties column from skills table',
      );

      this.logger.info(
        'Rollback AddAdditionalPropertiesToSkills completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddAdditionalPropertiesToSkills failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
