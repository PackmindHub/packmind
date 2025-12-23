import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'RemoveAIProvidersConfiguredAtAndSoftDelete1764600000000';

export class RemoveAIProvidersConfiguredAtAndSoftDelete1764600000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: RemoveAIProvidersConfiguredAtAndSoftDelete',
    );

    try {
      // Drop the unique index first (it references deleted_at)
      this.logger.debug(
        'Dropping unique index idx_ai_providers_organization from ai_providers table',
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_ai_providers_organization`,
      );

      // Drop configured_at column
      this.logger.debug(
        'Dropping configured_at column from ai_providers table',
      );
      await queryRunner.query(
        `ALTER TABLE ai_providers DROP COLUMN configured_at`,
      );

      // Drop soft delete columns
      this.logger.debug('Dropping deleted_at column from ai_providers table');
      await queryRunner.query(
        `ALTER TABLE ai_providers DROP COLUMN deleted_at`,
      );

      this.logger.debug('Dropping deleted_by column from ai_providers table');
      await queryRunner.query(
        `ALTER TABLE ai_providers DROP COLUMN deleted_by`,
      );

      // Recreate unique index without soft delete filter
      this.logger.debug(
        'Creating unique index idx_ai_providers_organization on ai_providers table',
      );
      await queryRunner.query(`
        CREATE UNIQUE INDEX idx_ai_providers_organization
        ON ai_providers(organization_id)
      `);

      this.logger.info(
        'Migration RemoveAIProvidersConfiguredAtAndSoftDelete completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration RemoveAIProvidersConfiguredAtAndSoftDelete failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: RemoveAIProvidersConfiguredAtAndSoftDelete',
    );

    try {
      // Drop unique index
      this.logger.debug(
        'Dropping unique index idx_ai_providers_organization from ai_providers table',
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_ai_providers_organization`,
      );

      // Recreate configured_at column
      this.logger.debug(
        'Recreating configured_at column in ai_providers table',
      );
      await queryRunner.query(`
        ALTER TABLE ai_providers
        ADD COLUMN configured_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);

      // Recreate soft delete columns
      this.logger.debug('Recreating deleted_at column in ai_providers table');
      await queryRunner.query(`
        ALTER TABLE ai_providers
        ADD COLUMN deleted_at timestamp with time zone NULL
      `);

      this.logger.debug('Recreating deleted_by column in ai_providers table');
      await queryRunner.query(`
        ALTER TABLE ai_providers
        ADD COLUMN deleted_by varchar NULL
      `);

      // Recreate unique index with soft delete filter
      this.logger.debug(
        'Creating unique index idx_ai_providers_organization with soft delete filter',
      );
      await queryRunner.query(`
        CREATE UNIQUE INDEX idx_ai_providers_organization
        ON ai_providers(organization_id)
        WHERE deleted_at IS NULL
      `);

      this.logger.info(
        'Rollback RemoveAIProvidersConfiguredAtAndSoftDelete completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback RemoveAIProvidersConfiguredAtAndSoftDelete failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
