import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreatePluginInstallationsAndTrackingToken1781624244359';

export class CreatePluginInstallationsAndTrackingToken1781624244359 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: CreatePluginInstallationsAndTrackingToken',
    );

    try {
      // 1. Create plugin_installations table
      this.logger.info('Creating plugin_installations table');
      await queryRunner.query(`
        CREATE TABLE "plugin_installations" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "marketplace_id" uuid NOT NULL,
          "plugin_slug" varchar NOT NULL,
          "package_id" uuid NULL,
          "installed_version" varchar NULL,
          "scope" varchar NOT NULL,
          "user_id" uuid NULL,
          "anonymous_id_hash" varchar NULL,
          "anonymous_email_masked" varchar NULL,
          "identity_key" varchar NOT NULL DEFAULT '',
          "repo_remote_url" text NULL,
          "repo_key" varchar NOT NULL DEFAULT '',
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
          "deleted_at" timestamp with time zone NULL,
          "deleted_by" varchar NULL,
          CONSTRAINT "pk_plugin_installations" PRIMARY KEY ("id"),
          CONSTRAINT "fk_plugin_installations_organization"
            FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
          CONSTRAINT "fk_plugin_installations_marketplace"
            FOREIGN KEY ("marketplace_id") REFERENCES "marketplaces" ("id") ON DELETE CASCADE
        )
      `);
      this.logger.info('plugin_installations table created');

      // 2. Create UNIQUE index enforcing the absent-field key rule (§7.1)
      //    Postgres treats NULLs as distinct in unique indexes — using NOT NULL
      //    '' fallback on identity_key and repo_key makes the index work correctly.
      this.logger.info(
        'Creating unique heartbeat index on plugin_installations',
      );
      await queryRunner.query(`
        CREATE UNIQUE INDEX "uq_plugin_installations_unique_heartbeat"
        ON "plugin_installations" ("marketplace_id", "plugin_slug", "scope", "identity_key", "repo_key")
        WHERE "deleted_at" IS NULL
      `);
      this.logger.info('Unique heartbeat index created');

      // 3. Create supporting indexes
      await queryRunner.query(`
        CREATE INDEX "idx_plugin_installations_marketplace_id"
        ON "plugin_installations" ("marketplace_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_plugin_installations_organization_id"
        ON "plugin_installations" ("organization_id")
      `);
      this.logger.info('Supporting indexes created on plugin_installations');

      // 4. Add tracking_token column to marketplaces (nullable initially for
      //    backward compatibility; backfill below makes it effectively NOT NULL)
      this.logger.info('Adding tracking_token column to marketplaces');
      await queryRunner.query(`
        ALTER TABLE "marketplaces"
        ADD COLUMN "tracking_token" varchar NULL
      `);
      this.logger.info('tracking_token column added to marketplaces');

      // 5. Backfill tracking_token for all existing marketplace rows
      //    Use gen_random_uuid() (built-in, Postgres 13+) to produce an opaque
      //    random value — no uuid-ossp extension required.
      this.logger.info(
        'Backfilling tracking_token for existing marketplace rows',
      );
      await queryRunner.query(`
        UPDATE "marketplaces"
        SET "tracking_token" = replace(gen_random_uuid()::text, '-', '')
        WHERE "tracking_token" IS NULL
      `);
      this.logger.info('tracking_token backfill completed');

      // 6. Create index for tracking-token lookup
      await queryRunner.query(`
        CREATE INDEX "idx_marketplace_tracking_token"
        ON "marketplaces" ("tracking_token")
      `);
      this.logger.info('tracking_token index created');

      this.logger.info(
        'Migration CreatePluginInstallationsAndTrackingToken completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration CreatePluginInstallationsAndTrackingToken failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: CreatePluginInstallationsAndTrackingToken',
    );

    try {
      // Reverse in opposite order to creation

      // 1. Drop tracking_token index + column from marketplaces
      this.logger.info('Dropping tracking_token index from marketplaces');
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_marketplace_tracking_token"
      `);
      this.logger.info('Dropping tracking_token column from marketplaces');
      await queryRunner.query(`
        ALTER TABLE "marketplaces"
        DROP COLUMN IF EXISTS "tracking_token"
      `);
      this.logger.info('tracking_token column removed from marketplaces');

      // 2. Drop plugin_installations table (cascades all its indexes/FK constraints)
      this.logger.info('Dropping plugin_installations table');
      await queryRunner.query(`
        DROP TABLE IF EXISTS "plugin_installations"
      `);
      this.logger.info('plugin_installations table dropped');

      this.logger.info(
        'Rollback CreatePluginInstallationsAndTrackingToken completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback CreatePluginInstallationsAndTrackingToken failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
