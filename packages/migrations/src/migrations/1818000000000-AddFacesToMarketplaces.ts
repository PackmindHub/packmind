import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddFacesToMarketplaces1818000000000';

/**
 * Adds the `faces` jsonb column to the `marketplaces` table.
 *
 * A face is one vendor-specific descriptor projection of the shared plugin
 * payload (e.g. `.claude-plugin/marketplace.json` for Claude Code,
 * `.github/plugin/marketplace.json` for GitHub Copilot). The column stores
 * the list of `MarketplaceFaceId` values the marketplace serves; the publish
 * job writes one descriptor per face.
 *
 * Defaults to `["claude"]`, which also backfills every existing row — all
 * marketplaces created before multi-face support served the Claude descriptor
 * only (their `vendor` is `'anthropic'`).
 *
 * The `down` method drops the column, fully reversing the change.
 */
export class AddFacesToMarketplaces1818000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddFacesToMarketplaces');

    try {
      this.logger.debug('Adding marketplaces.faces column');
      await queryRunner.query(`
        ALTER TABLE "marketplaces"
        ADD COLUMN "faces" jsonb NOT NULL DEFAULT '["claude"]'
      `);

      this.logger.info('Migration AddFacesToMarketplaces completed');
    } catch (error) {
      this.logger.error('Migration AddFacesToMarketplaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddFacesToMarketplaces');

    try {
      this.logger.debug('Dropping marketplaces.faces column');
      await queryRunner.query(`
        ALTER TABLE "marketplaces"
        DROP COLUMN "faces"
      `);

      this.logger.info('Rollback AddFacesToMarketplaces completed');
    } catch (error) {
      this.logger.error('Rollback AddFacesToMarketplaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
