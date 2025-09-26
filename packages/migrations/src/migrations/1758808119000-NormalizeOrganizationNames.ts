import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/shared';

const origin = 'NormalizeOrganizationNames1758808119000';

export class NormalizeOrganizationNames1758808119000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: NormalizeOrganizationNames');

    try {
      // First, let's create a temporary table to store original names for rollback
      this.logger.debug('Creating temporary table for rollback data');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS organization_name_backup (
          id UUID PRIMARY KEY,
          original_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Store original names for rollback
      this.logger.debug('Backing up original organization names');
      await queryRunner.query(`
        INSERT INTO organization_name_backup (id, original_name)
        SELECT id, name FROM organizations
      `);

      // Find organizations that would have duplicate slugs when their names are slugified
      this.logger.debug('Finding organizations with potential slug conflicts');
      const duplicateGroups = await queryRunner.query(`
        WITH slugified_names AS (
          SELECT
            id,
            name,
            slug,
            -- Slugify the name using similar logic to the 'slug' package:
            -- 1. Convert to lowercase
            -- 2. Replace spaces and special characters with hyphens
            -- 3. Remove multiple consecutive hyphens
            -- 4. Remove leading/trailing hyphens
            TRIM(REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  LOWER(name),
                  '[^a-z0-9]+', '-', 'g'
                ),
                '-+', '-', 'g'
              ),
              '^-|-$', '', 'g'
            )) AS would_be_slug
          FROM organizations
        ),
        duplicate_groups AS (
          SELECT would_be_slug, COUNT(*) as count_orgs
          FROM slugified_names
          GROUP BY would_be_slug
          HAVING COUNT(*) > 1
        )
        SELECT s.id, s.name, s.slug, s.would_be_slug
        FROM slugified_names s
        INNER JOIN duplicate_groups d ON s.would_be_slug = d.would_be_slug
        ORDER BY s.would_be_slug, s.slug
      `);

      if (duplicateGroups.length === 0) {
        this.logger.info('No organizations found with slug conflicts');
        return;
      }

      this.logger.info(
        `Found ${duplicateGroups.length} organizations with potential slug conflicts`,
        {
          conflicts: duplicateGroups.map((org) => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            wouldBeSlug: org.would_be_slug,
          })),
        },
      );

      // Group the duplicates and rename all but the first one (which keeps original name)
      interface OrganizationRecord {
        id: string;
        name: string;
        slug: string;
        would_be_slug: string;
      }

      const slugGroups: Record<string, OrganizationRecord[]> =
        duplicateGroups.reduce(
          (groups, org) => {
            if (!groups[org.would_be_slug]) {
              groups[org.would_be_slug] = [];
            }
            groups[org.would_be_slug].push(org);
            return groups;
          },
          {} as Record<string, OrganizationRecord[]>,
        );

      // Process each group of duplicates
      for (const [wouldBeSlug, orgsInGroup] of Object.entries(slugGroups)) {
        this.logger.debug(`Processing slug group: ${wouldBeSlug}`, {
          organizationsInGroup: orgsInGroup.length,
        });

        // Skip the first organization (keep original name), rename the rest
        for (let i = 1; i < orgsInGroup.length; i++) {
          const org = orgsInGroup[i];
          const newName = org.slug;

          this.logger.info(`Renaming organization to match its slug`, {
            id: org.id,
            oldName: org.name,
            newName: newName,
            slug: org.slug,
          });

          await queryRunner.query(
            'UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2',
            [newName, org.id],
          );
        }
      }

      this.logger.info(
        'Migration NormalizeOrganizationNames completed successfully',
        {
          totalOrgsProcessed: duplicateGroups.length,
          orgsRenamed: duplicateGroups.length - Object.keys(slugGroups).length,
        },
      );
    } catch (error) {
      this.logger.error('Migration NormalizeOrganizationNames failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: NormalizeOrganizationNames');

    try {
      // Check if backup table exists
      const backupTableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'organization_name_backup'
        )
      `);

      if (!backupTableExists[0].exists) {
        this.logger.warn(
          'Backup table not found, cannot rollback organization names',
        );
        return;
      }

      this.logger.debug('Restoring original organization names from backup');
      await queryRunner.query(`
        UPDATE organizations
        SET
          name = backup.original_name,
          updated_at = NOW()
        FROM organization_name_backup backup
        WHERE organizations.id = backup.id
      `);

      this.logger.debug('Dropping backup table');
      await queryRunner.query('DROP TABLE IF EXISTS organization_name_backup');

      this.logger.info(
        'Rollback NormalizeOrganizationNames completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback NormalizeOrganizationNames failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
