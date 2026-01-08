import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { uuidMigrationColumn } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateSkillFilesTable1767867634000';

export class CreateSkillFilesTable1767867634000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly skillFilesTable = new Table({
    name: 'skill_files',
    columns: [
      uuidMigrationColumn,
      {
        name: 'skill_version_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'path',
        type: 'varchar',
        length: '1000',
        isNullable: false,
      },
      {
        name: 'content',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'permissions',
        type: 'varchar',
        length: '10',
        isNullable: false,
      },
    ],
  });

  private readonly skillFilesVersionForeignKey = new TableForeignKey({
    columnNames: ['skill_version_id'],
    referencedTableName: 'skill_versions',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_skill_files_skill_version',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateSkillFilesTable');

    try {
      this.logger.debug('Creating skill_files table');
      await queryRunner.createTable(this.skillFilesTable);
      this.logger.info('Successfully created skill_files table');

      this.logger.debug('Creating index for skill_files table');
      await queryRunner.createIndex(
        'skill_files',
        new TableIndex({
          name: 'idx_skill_file_version',
          columnNames: ['skill_version_id'],
        }),
      );
      this.logger.info('Successfully created index for skill_files table');

      this.logger.debug('Adding foreign key constraint for skill_files table');
      await queryRunner.createForeignKey(
        'skill_files',
        this.skillFilesVersionForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint for skill_files table',
      );

      this.logger.info(
        'Migration CreateSkillFilesTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateSkillFilesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateSkillFilesTable');

    try {
      this.logger.debug(
        'Dropping foreign key constraint for skill_files table',
      );
      await queryRunner.dropForeignKey(
        'skill_files',
        this.skillFilesVersionForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint for skill_files table',
      );

      this.logger.debug('Dropping index for skill_files table');
      await queryRunner.dropIndex('skill_files', 'idx_skill_file_version');
      this.logger.info('Successfully dropped index for skill_files table');

      this.logger.debug('Dropping skill_files table');
      await queryRunner.dropTable('skill_files', true);
      this.logger.info('Successfully dropped skill_files table');

      this.logger.info('Rollback CreateSkillFilesTable completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreateSkillFilesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
