import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddAgentToPluginInstallations1820000000000';

/**
 * Migration: AddAgentToPluginInstallations
 *
 * Adds `agent` and `identity_source` to `plugin_installations`, and widens the
 * heartbeat UNIQUE index to include `agent`.
 *
 * `agent` is NOT NULL DEFAULT 'claude-code': every existing row came from a
 * Claude Code session, and the column joins the UNIQUE index — Postgres treats
 * NULLs as distinct, so a nullable value would let every heartbeat from an
 * agent-less client insert a fresh row instead of bumping the existing one.
 *
 * Widening the index is the point of the migration, not a side effect: without
 * `agent` in the key, the same person on the same repo running both Claude Code
 * and Copilot CLI would collapse into one row and the two agents would
 * overwrite each other's `installed_version` / `installed_revision`.
 *
 * `identity_source` is nullable with no backfill. It is descriptive, not part of
 * the key: Claude reads the signed-in account email while Copilot falls back to
 * `git config user.email`, and the column records which one produced the hash.
 * Rows predating it stay NULL rather than being asserted to be one or the other.
 */
export class AddAgentToPluginInstallations1820000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddAgentToPluginInstallations');
    try {
      await queryRunner.query(`
        ALTER TABLE "plugin_installations"
        ADD COLUMN IF NOT EXISTS "agent" varchar NOT NULL DEFAULT 'claude-code'
      `);
      this.logger.info('Added agent column to plugin_installations');

      await queryRunner.query(`
        ALTER TABLE "plugin_installations"
        ADD COLUMN IF NOT EXISTS "identity_source" varchar NULL
      `);
      this.logger.info('Added identity_source column to plugin_installations');

      await queryRunner.query(`
        DROP INDEX IF EXISTS "uq_plugin_installations_unique_heartbeat"
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "uq_plugin_installations_unique_heartbeat"
        ON "plugin_installations" (
          "marketplace_id", "plugin_slug", "scope", "agent", "identity_key", "repo_key"
        )
      `);
      this.logger.info('Widened heartbeat unique index to include agent');

      this.logger.info(
        'Migration AddAgentToPluginInstallations completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddAgentToPluginInstallations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddAgentToPluginInstallations');
    try {
      // Narrowing the index back is only possible once the rows the wider key
      // made room for are gone: two rows differing only by `agent` collide on
      // the 5-column key. Copilot heartbeats are exactly those rows, and they
      // are re-derivable from the next session, so dropping them is the
      // reversible choice — leaving them would make the rollback fail outright.
      const deleted: Array<Record<string, unknown>> = await queryRunner.query(`
        DELETE FROM "plugin_installations" WHERE "agent" <> 'claude-code'
        RETURNING "id"
      `);
      this.logger.info('Removed non-Claude heartbeat rows before narrowing', {
        removedCount: Array.isArray(deleted) ? deleted.length : 0,
      });

      await queryRunner.query(`
        DROP INDEX IF EXISTS "uq_plugin_installations_unique_heartbeat"
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "uq_plugin_installations_unique_heartbeat"
        ON "plugin_installations" (
          "marketplace_id", "plugin_slug", "scope", "identity_key", "repo_key"
        )
      `);

      await queryRunner.query(`
        ALTER TABLE "plugin_installations"
        DROP COLUMN IF EXISTS "identity_source"
      `);
      await queryRunner.query(`
        ALTER TABLE "plugin_installations" DROP COLUMN IF EXISTS "agent"
      `);

      this.logger.info(
        'Rollback AddAgentToPluginInstallations completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddAgentToPluginInstallations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
