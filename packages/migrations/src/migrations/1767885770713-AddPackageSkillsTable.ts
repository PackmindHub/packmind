import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddPackageSkillsTable1767885770713';

export class AddPackageSkillsTable1767885770713 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly packageSkillsTable = new Table({
    name: 'package_skills',
    columns: [
      {
        name: 'package_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'skill_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly packageSkillsPackageForeignKey = new TableForeignKey({
    columnNames: ['package_id'],
    referencedTableName: 'packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_package_skills_package',
  });

  private readonly packageSkillsSkillForeignKey = new TableForeignKey({
    columnNames: ['skill_id'],
    referencedTableName: 'skills',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_package_skills_skill',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddPackageSkillsTable');

    try {
      this.logger.debug('Creating package_skills join table');
      await queryRunner.createTable(this.packageSkillsTable);
      this.logger.info('Successfully created package_skills join table');

      this.logger.debug('Creating unique index on package_skills');
      await queryRunner.createIndex(
        'package_skills',
        new TableIndex({
          name: 'idx_package_skills_unique',
          columnNames: ['package_id', 'skill_id'],
          isUnique: true,
        }),
      );
      this.logger.info('Successfully created unique index on package_skills');

      this.logger.debug(
        'Adding foreign key constraints to package_skills table',
      );
      await queryRunner.createForeignKey(
        'package_skills',
        this.packageSkillsPackageForeignKey,
      );
      await queryRunner.createForeignKey(
        'package_skills',
        this.packageSkillsSkillForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints to package_skills table',
      );

      this.logger.info(
        'Migration AddPackageSkillsTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddPackageSkillsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddPackageSkillsTable');

    try {
      this.logger.debug(
        'Dropping foreign key constraints from package_skills table',
      );
      await queryRunner.dropForeignKey(
        'package_skills',
        this.packageSkillsSkillForeignKey,
      );
      await queryRunner.dropForeignKey(
        'package_skills',
        this.packageSkillsPackageForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints from package_skills table',
      );

      this.logger.debug('Dropping index on package_skills');
      await queryRunner.dropIndex(
        'package_skills',
        'idx_package_skills_unique',
      );
      this.logger.info('Successfully dropped index on package_skills');

      this.logger.debug('Dropping package_skills table');
      await queryRunner.dropTable('package_skills', true);
      this.logger.info('Successfully dropped package_skills table');

      this.logger.info('Rollback AddPackageSkillsTable completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddPackageSkillsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
