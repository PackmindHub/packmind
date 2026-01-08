import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateSkillsTables1767860671000';

export class CreateSkillsTables1767860671000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // Table definitions
  private readonly skillsTable = new Table({
    name: 'skills',
    columns: [
      uuidMigrationColumn,
      {
        name: 'space_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'name',
        type: 'varchar',
        length: '255',
        isNullable: false,
      },
      {
        name: 'slug',
        type: 'varchar',
        length: '255',
        isNullable: false,
      },
      {
        name: 'description',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'version',
        type: 'integer',
        isNullable: false,
        default: 1,
      },
      {
        name: 'prompt',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'license',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'compatibility',
        type: 'varchar',
        length: '500',
        isNullable: true,
      },
      {
        name: 'metadata',
        type: 'jsonb',
        isNullable: true,
      },
      {
        name: 'allowed_tools',
        type: 'text',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly skillVersionsTable = new Table({
    name: 'skill_versions',
    columns: [
      uuidMigrationColumn,
      {
        name: 'skill_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'name',
        type: 'varchar',
        length: '255',
        isNullable: false,
      },
      {
        name: 'slug',
        type: 'varchar',
        length: '255',
        isNullable: false,
      },
      {
        name: 'description',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'version',
        type: 'integer',
        isNullable: false,
      },
      {
        name: 'prompt',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'license',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'compatibility',
        type: 'varchar',
        length: '500',
        isNullable: true,
      },
      {
        name: 'metadata',
        type: 'jsonb',
        isNullable: true,
      },
      {
        name: 'allowed_tools',
        type: 'text',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
    ],
  });

  // Foreign key definitions
  private readonly skillVersionsSkillForeignKey = new TableForeignKey({
    columnNames: ['skill_id'],
    referencedTableName: 'skills',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_skill_versions_skill',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateSkillsTables');

    try {
      // Create main tables
      this.logger.debug('Creating skills table');
      await queryRunner.createTable(this.skillsTable);
      this.logger.info('Successfully created skills table');

      this.logger.debug('Creating skill_versions table');
      await queryRunner.createTable(this.skillVersionsTable);
      this.logger.info('Successfully created skill_versions table');

      // Create indices for skills table
      this.logger.debug('Creating indices for skills table');
      await queryRunner.createIndex(
        'skills',
        new TableIndex({
          name: 'idx_skill_user',
          columnNames: ['user_id'],
        }),
      );
      await queryRunner.createIndex(
        'skills',
        new TableIndex({
          name: 'idx_skill_space',
          columnNames: ['space_id'],
        }),
      );
      await queryRunner.createIndex(
        'skills',
        new TableIndex({
          name: 'idx_skill_slug',
          columnNames: ['slug'],
        }),
      );
      this.logger.info('Successfully created indices for skills table');

      // Create indices for skill_versions table
      this.logger.debug('Creating indices for skill_versions table');
      await queryRunner.createIndex(
        'skill_versions',
        new TableIndex({
          name: 'idx_skill_version_skill',
          columnNames: ['skill_id'],
        }),
      );
      await queryRunner.createIndex(
        'skill_versions',
        new TableIndex({
          name: 'uidx_skill_version',
          columnNames: ['skill_id', 'version'],
          isUnique: true,
        }),
      );
      this.logger.info('Successfully created indices for skill_versions table');

      // Create foreign keys
      this.logger.debug(
        'Adding foreign key constraints for skill_versions table',
      );
      await queryRunner.createForeignKey(
        'skill_versions',
        this.skillVersionsSkillForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for skill_versions table',
      );

      this.logger.info('Migration CreateSkillsTables completed successfully');
    } catch (error) {
      this.logger.error('Migration CreateSkillsTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateSkillsTables');

    try {
      // Drop foreign keys
      this.logger.debug(
        'Dropping foreign key constraints for skill_versions table',
      );
      await queryRunner.dropForeignKey(
        'skill_versions',
        this.skillVersionsSkillForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for skill_versions table',
      );

      // Drop indices for skill_versions table
      this.logger.debug('Dropping indices for skill_versions table');
      await queryRunner.dropIndex('skill_versions', 'uidx_skill_version');
      await queryRunner.dropIndex('skill_versions', 'idx_skill_version_skill');
      this.logger.info('Successfully dropped indices for skill_versions table');

      // Drop indices for skills table
      this.logger.debug('Dropping indices for skills table');
      await queryRunner.dropIndex('skills', 'idx_skill_slug');
      await queryRunner.dropIndex('skills', 'idx_skill_space');
      await queryRunner.dropIndex('skills', 'idx_skill_user');
      this.logger.info('Successfully dropped indices for skills table');

      // Drop tables in reverse dependency order
      this.logger.debug('Dropping skill_versions table');
      await queryRunner.dropTable('skill_versions', true);
      this.logger.info('Successfully dropped skill_versions table');

      this.logger.debug('Dropping skills table');
      await queryRunner.dropTable('skills', true);
      this.logger.info('Successfully dropped skills table');

      this.logger.info('Rollback CreateSkillsTables completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreateSkillsTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
