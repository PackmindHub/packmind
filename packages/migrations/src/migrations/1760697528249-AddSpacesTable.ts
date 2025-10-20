import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/shared/src/database/migrationColumns';
import { PackmindLogger } from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';

const origin = 'AddSpacesTable1760697528249';

export class AddSpacesTable1760697528249 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly spacesTable = new Table({
    name: 'spaces',
    columns: [
      uuidMigrationColumn,
      {
        name: 'name',
        type: 'varchar',
        length: '255',
      },
      {
        name: 'slug',
        type: 'varchar',
        length: '255',
      },
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly spaceOrganizationForeignKey = new TableForeignKey({
    name: 'FK_space_organization',
    columnNames: ['organization_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'organizations',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSpacesTable');

    try {
      this.logger.debug('Creating spaces table');
      await queryRunner.createTable(this.spacesTable);
      this.logger.info('Successfully created spaces table');

      this.logger.debug('Adding foreign key to spaces table');
      await queryRunner.createForeignKey(
        'spaces',
        this.spaceOrganizationForeignKey,
      );
      this.logger.info('Successfully added foreign key to spaces table');

      this.logger.debug('Creating index on spaces.organization_id');
      await queryRunner.query(
        'CREATE INDEX "idx_space_organization" ON "spaces" ("organization_id")',
      );
      this.logger.info('Successfully created index on spaces.organization_id');

      this.logger.debug(
        'Creating unique index on spaces (slug, organization_id)',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX "idx_space_slug" ON "spaces" ("slug", "organization_id") WHERE deleted_at IS NULL',
      );
      this.logger.info(
        'Successfully created unique index on spaces (slug, organization_id)',
      );

      // Backfill: Create "Global" space for each existing organization
      this.logger.debug('Finding all existing organizations');
      const organizations = await queryRunner.query(`
        SELECT id, created_at, updated_at
        FROM organizations
        WHERE deleted_at IS NULL
      `);

      this.logger.info(
        `Found ${organizations.length} organizations to create default spaces for`,
      );

      if (organizations.length === 0) {
        this.logger.info('No organizations found, skipping backfill');
        this.logger.info('Migration AddSpacesTable completed successfully');
        return;
      }

      // Insert "Global" space for each organization
      this.logger.debug('Creating default "Global" spaces for organizations');
      for (const org of organizations) {
        const spaceId = uuidv4();
        const now = new Date();

        await queryRunner.query(
          `
          INSERT INTO spaces (id, name, slug, organization_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [spaceId, 'Global', 'global', org.id, now, now],
        );

        this.logger.debug(`Created "Global" space for organization: ${org.id}`);
      }

      this.logger.info(
        `Successfully created ${organizations.length} default "Global" spaces`,
      );
      this.logger.info('Migration AddSpacesTable completed successfully');
    } catch (error) {
      this.logger.error('Migration AddSpacesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSpacesTable');

    try {
      this.logger.debug('Dropping unique index from spaces table');
      await queryRunner.query('DROP INDEX "idx_space_slug"');
      this.logger.info('Successfully dropped unique index from spaces table');

      this.logger.debug('Dropping index from spaces table');
      await queryRunner.query('DROP INDEX "idx_space_organization"');
      this.logger.info('Successfully dropped index from spaces table');

      this.logger.debug('Dropping foreign key from spaces table');
      await queryRunner.dropForeignKey(
        'spaces',
        this.spaceOrganizationForeignKey,
      );
      this.logger.info('Successfully dropped foreign key from spaces table');

      this.logger.debug('Dropping spaces table');
      await queryRunner.dropTable(this.spacesTable);
      this.logger.info('Successfully dropped spaces table');

      this.logger.info('Rollback AddSpacesTable completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddSpacesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
