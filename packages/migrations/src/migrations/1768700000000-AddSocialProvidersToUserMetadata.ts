import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddSocialProvidersToUserMetadata1768700000000';

export class AddSocialProvidersToUserMetadata1768700000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSocialProvidersToUserMetadata');

    try {
      await queryRunner.addColumn(
        'user_metadata',
        new TableColumn({
          name: 'social_providers',
          type: 'text',
          isArray: true,
          default: "'{}'",
          isNullable: false,
        }),
      );

      this.logger.info(
        'Migration AddSocialProvidersToUserMetadata completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddSocialProvidersToUserMetadata failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSocialProvidersToUserMetadata');

    try {
      await queryRunner.dropColumn('user_metadata', 'social_providers');

      this.logger.info(
        'Rollback AddSocialProvidersToUserMetadata completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddSocialProvidersToUserMetadata failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
