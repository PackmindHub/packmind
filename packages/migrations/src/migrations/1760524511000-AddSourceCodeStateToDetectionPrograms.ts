import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddSourceCodeStateToDetectionPrograms1760524511000';

export class AddSourceCodeStateToDetectionPrograms1760524511000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddSourceCodeStateToDetectionPrograms',
    );

    try {
      this.logger.debug(
        'Adding source_code_state column to detection_programs table',
      );

      // Add the column with a default value to handle existing records
      await queryRunner.query(`
        ALTER TABLE "detection_programs" 
        ADD COLUMN "source_code_state" varchar NOT NULL DEFAULT 'NONE'
      `);

      this.logger.info('Successfully added source_code_state column');

      // Remove the default after adding the column
      await queryRunner.query(`
        ALTER TABLE "detection_programs" 
        ALTER COLUMN "source_code_state" DROP DEFAULT
      `);

      this.logger.info(
        'Migration AddSourceCodeStateToDetectionPrograms completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddSourceCodeStateToDetectionPrograms failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddSourceCodeStateToDetectionPrograms',
    );

    try {
      this.logger.debug(
        'Dropping source_code_state column from detection_programs table',
      );

      await queryRunner.query(`
        ALTER TABLE "detection_programs" 
        DROP COLUMN "source_code_state"
      `);

      this.logger.info(
        'Rollback AddSourceCodeStateToDetectionPrograms completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddSourceCodeStateToDetectionPrograms failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
