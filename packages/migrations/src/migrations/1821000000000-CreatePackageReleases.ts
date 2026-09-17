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
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreatePackageReleases1821000000000';

export class CreatePackageReleases1821000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // A release carries the package's name and description as they were at the
  // cut, so browsing an old release shows the title it was published under.
  // No deleted_at: a release is immutable and undeletable.
  private readonly packageReleasesTable = new Table({
    name: 'package_releases',
    columns: [
      uuidMigrationColumn,
      {
        name: 'package_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'version',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'name',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'description',
        type: 'text',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly packageReleaseCommandVersionsTable = new Table({
    name: 'package_release_command_versions',
    columns: [
      {
        name: 'package_release_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'command_version_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly packageReleaseStandardVersionsTable = new Table({
    name: 'package_release_standard_versions',
    columns: [
      {
        name: 'package_release_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'standard_version_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly packageReleaseSkillVersionsTable = new Table({
    name: 'package_release_skill_versions',
    columns: [
      {
        name: 'package_release_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'skill_version_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly packageReleasesPackageFK = new TableForeignKey({
    columnNames: ['package_id'],
    referencedTableName: 'packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_package_releases_package',
  });

  private readonly prcvPackageReleaseFK = new TableForeignKey({
    columnNames: ['package_release_id'],
    referencedTableName: 'package_releases',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_prcv_package_release',
  });

  private readonly prcvCommandVersionFK = new TableForeignKey({
    columnNames: ['command_version_id'],
    referencedTableName: 'command_versions',
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
    name: 'FK_prcv_command_version',
  });

  private readonly prsvPackageReleaseFK = new TableForeignKey({
    columnNames: ['package_release_id'],
    referencedTableName: 'package_releases',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_prsv_package_release',
  });

  private readonly prsvStandardVersionFK = new TableForeignKey({
    columnNames: ['standard_version_id'],
    referencedTableName: 'standard_versions',
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
    name: 'FK_prsv_standard_version',
  });

  private readonly prskvPackageReleaseFK = new TableForeignKey({
    columnNames: ['package_release_id'],
    referencedTableName: 'package_releases',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_prskv_package_release',
  });

  private readonly prskvSkillVersionFK = new TableForeignKey({
    columnNames: ['skill_version_id'],
    referencedTableName: 'skill_versions',
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
    name: 'FK_prskv_skill_version',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreatePackageReleases');

    try {
      await queryRunner.createTable(this.packageReleasesTable);

      await queryRunner.createIndex(
        'package_releases',
        new TableIndex({
          name: 'idx_package_releases_unique',
          columnNames: ['package_id', 'version'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'package_releases',
        this.packageReleasesPackageFK,
      );

      this.logger.info('Successfully created package_releases table');

      await queryRunner.createTable(this.packageReleaseCommandVersionsTable);

      await queryRunner.createIndex(
        'package_release_command_versions',
        new TableIndex({
          name: 'idx_prcv_unique',
          columnNames: ['package_release_id', 'command_version_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'package_release_command_versions',
        this.prcvPackageReleaseFK,
      );
      await queryRunner.createForeignKey(
        'package_release_command_versions',
        this.prcvCommandVersionFK,
      );

      this.logger.info(
        'Successfully created package_release_command_versions table',
      );

      await queryRunner.createTable(this.packageReleaseStandardVersionsTable);

      await queryRunner.createIndex(
        'package_release_standard_versions',
        new TableIndex({
          name: 'idx_prsv_unique',
          columnNames: ['package_release_id', 'standard_version_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'package_release_standard_versions',
        this.prsvPackageReleaseFK,
      );
      await queryRunner.createForeignKey(
        'package_release_standard_versions',
        this.prsvStandardVersionFK,
      );

      this.logger.info(
        'Successfully created package_release_standard_versions table',
      );

      await queryRunner.createTable(this.packageReleaseSkillVersionsTable);

      await queryRunner.createIndex(
        'package_release_skill_versions',
        new TableIndex({
          name: 'idx_prskv_unique',
          columnNames: ['package_release_id', 'skill_version_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'package_release_skill_versions',
        this.prskvPackageReleaseFK,
      );
      await queryRunner.createForeignKey(
        'package_release_skill_versions',
        this.prskvSkillVersionFK,
      );

      this.logger.info(
        'Successfully created package_release_skill_versions table',
      );

      this.logger.info(
        'Migration CreatePackageReleases completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreatePackageReleases failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreatePackageReleases');

    try {
      await queryRunner.dropForeignKey(
        'package_release_skill_versions',
        this.prskvSkillVersionFK,
      );
      await queryRunner.dropForeignKey(
        'package_release_skill_versions',
        this.prskvPackageReleaseFK,
      );
      await queryRunner.dropIndex(
        'package_release_skill_versions',
        'idx_prskv_unique',
      );
      await queryRunner.dropTable('package_release_skill_versions', true);

      this.logger.info(
        'Successfully dropped package_release_skill_versions table',
      );

      await queryRunner.dropForeignKey(
        'package_release_standard_versions',
        this.prsvStandardVersionFK,
      );
      await queryRunner.dropForeignKey(
        'package_release_standard_versions',
        this.prsvPackageReleaseFK,
      );
      await queryRunner.dropIndex(
        'package_release_standard_versions',
        'idx_prsv_unique',
      );
      await queryRunner.dropTable('package_release_standard_versions', true);

      this.logger.info(
        'Successfully dropped package_release_standard_versions table',
      );

      await queryRunner.dropForeignKey(
        'package_release_command_versions',
        this.prcvCommandVersionFK,
      );
      await queryRunner.dropForeignKey(
        'package_release_command_versions',
        this.prcvPackageReleaseFK,
      );
      await queryRunner.dropIndex(
        'package_release_command_versions',
        'idx_prcv_unique',
      );
      await queryRunner.dropTable('package_release_command_versions', true);

      this.logger.info(
        'Successfully dropped package_release_command_versions table',
      );

      await queryRunner.dropForeignKey(
        'package_releases',
        this.packageReleasesPackageFK,
      );
      await queryRunner.dropIndex(
        'package_releases',
        'idx_package_releases_unique',
      );
      await queryRunner.dropTable('package_releases', true);

      this.logger.info('Successfully dropped package_releases table');

      this.logger.info('Rollback CreatePackageReleases completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreatePackageReleases failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
