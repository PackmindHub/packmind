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

const origin = 'CreateDistributionTables1764700000000';

export class CreateDistributionTables1764700000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // Table definitions
  private readonly distributionsTable = new Table({
    name: 'distributions',
    columns: [
      uuidMigrationColumn,
      {
        name: 'git_commit_id',
        type: 'uuid',
        isNullable: true,
      },
      {
        name: 'author_id',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'target_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'status',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'error',
        type: 'text',
        isNullable: true,
      },
      {
        name: 'render_modes',
        type: 'json',
        isNullable: false,
        default: "'[]'",
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly distributedPackagesTable = new Table({
    name: 'distributed_packages',
    columns: [
      uuidMigrationColumn,
      {
        name: 'distribution_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'package_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly distributedPackageStandardVersionsTable = new Table({
    name: 'distributed_package_standard_versions',
    columns: [
      {
        name: 'distributed_package_id',
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

  private readonly distributedPackageRecipeVersionsTable = new Table({
    name: 'distributed_package_recipe_versions',
    columns: [
      {
        name: 'distributed_package_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'recipe_version_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  // Foreign key definitions for distributions table
  private readonly distributionsGitCommitFK = new TableForeignKey({
    columnNames: ['git_commit_id'],
    referencedTableName: 'git_commits',
    referencedColumnNames: ['id'],
    onDelete: 'SET NULL',
    name: 'FK_distributions_git_commit',
  });

  private readonly distributionsTargetFK = new TableForeignKey({
    columnNames: ['target_id'],
    referencedTableName: 'targets',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_distributions_target',
  });

  private readonly distributionsOrganizationFK = new TableForeignKey({
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_distributions_organization',
  });

  // Foreign key definitions for distributed_packages table
  private readonly distributedPackagesDistributionFK = new TableForeignKey({
    columnNames: ['distribution_id'],
    referencedTableName: 'distributions',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_distributed_packages_distribution',
  });

  private readonly distributedPackagesPackageFK = new TableForeignKey({
    columnNames: ['package_id'],
    referencedTableName: 'packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_distributed_packages_package',
  });

  // Foreign key definitions for junction tables
  private readonly dpsvDistributedPackageFK = new TableForeignKey({
    columnNames: ['distributed_package_id'],
    referencedTableName: 'distributed_packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_dpsv_distributed_package',
  });

  private readonly dpsvStandardVersionFK = new TableForeignKey({
    columnNames: ['standard_version_id'],
    referencedTableName: 'standard_versions',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_dpsv_standard_version',
  });

  private readonly dprvDistributedPackageFK = new TableForeignKey({
    columnNames: ['distributed_package_id'],
    referencedTableName: 'distributed_packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_dprv_distributed_package',
  });

  private readonly dprvRecipeVersionFK = new TableForeignKey({
    columnNames: ['recipe_version_id'],
    referencedTableName: 'recipe_versions',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_dprv_recipe_version',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateDistributionTables');

    try {
      // Create distributions table
      await queryRunner.createTable(this.distributionsTable);

      await queryRunner.createIndex(
        'distributions',
        new TableIndex({
          name: 'idx_distributions_organization',
          columnNames: ['organization_id'],
        }),
      );

      await queryRunner.createIndex(
        'distributions',
        new TableIndex({
          name: 'idx_distributions_target',
          columnNames: ['target_id'],
        }),
      );

      await queryRunner.createForeignKey(
        'distributions',
        this.distributionsGitCommitFK,
      );
      await queryRunner.createForeignKey(
        'distributions',
        this.distributionsTargetFK,
      );
      await queryRunner.createForeignKey(
        'distributions',
        this.distributionsOrganizationFK,
      );

      this.logger.info('Successfully created distributions table');

      // Create distributed_packages table
      await queryRunner.createTable(this.distributedPackagesTable);

      await queryRunner.createIndex(
        'distributed_packages',
        new TableIndex({
          name: 'idx_distributed_packages_distribution',
          columnNames: ['distribution_id'],
        }),
      );

      await queryRunner.createIndex(
        'distributed_packages',
        new TableIndex({
          name: 'idx_distributed_packages_unique',
          columnNames: ['distribution_id', 'package_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'distributed_packages',
        this.distributedPackagesDistributionFK,
      );
      await queryRunner.createForeignKey(
        'distributed_packages',
        this.distributedPackagesPackageFK,
      );

      this.logger.info('Successfully created distributed_packages table');

      // Create distributed_package_standard_versions junction table
      await queryRunner.createTable(
        this.distributedPackageStandardVersionsTable,
      );

      await queryRunner.createIndex(
        'distributed_package_standard_versions',
        new TableIndex({
          name: 'idx_dpsv_unique',
          columnNames: ['distributed_package_id', 'standard_version_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'distributed_package_standard_versions',
        this.dpsvDistributedPackageFK,
      );
      await queryRunner.createForeignKey(
        'distributed_package_standard_versions',
        this.dpsvStandardVersionFK,
      );

      this.logger.info(
        'Successfully created distributed_package_standard_versions table',
      );

      // Create distributed_package_recipe_versions junction table
      await queryRunner.createTable(this.distributedPackageRecipeVersionsTable);

      await queryRunner.createIndex(
        'distributed_package_recipe_versions',
        new TableIndex({
          name: 'idx_dprv_unique',
          columnNames: ['distributed_package_id', 'recipe_version_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'distributed_package_recipe_versions',
        this.dprvDistributedPackageFK,
      );
      await queryRunner.createForeignKey(
        'distributed_package_recipe_versions',
        this.dprvRecipeVersionFK,
      );

      this.logger.info(
        'Successfully created distributed_package_recipe_versions table',
      );

      this.logger.info(
        'Migration CreateDistributionTables completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateDistributionTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateDistributionTables');

    try {
      // Drop distributed_package_recipe_versions table
      await queryRunner.dropForeignKey(
        'distributed_package_recipe_versions',
        this.dprvRecipeVersionFK,
      );
      await queryRunner.dropForeignKey(
        'distributed_package_recipe_versions',
        this.dprvDistributedPackageFK,
      );
      await queryRunner.dropIndex(
        'distributed_package_recipe_versions',
        'idx_dprv_unique',
      );
      await queryRunner.dropTable('distributed_package_recipe_versions', true);

      this.logger.info(
        'Successfully dropped distributed_package_recipe_versions table',
      );

      // Drop distributed_package_standard_versions table
      await queryRunner.dropForeignKey(
        'distributed_package_standard_versions',
        this.dpsvStandardVersionFK,
      );
      await queryRunner.dropForeignKey(
        'distributed_package_standard_versions',
        this.dpsvDistributedPackageFK,
      );
      await queryRunner.dropIndex(
        'distributed_package_standard_versions',
        'idx_dpsv_unique',
      );
      await queryRunner.dropTable(
        'distributed_package_standard_versions',
        true,
      );

      this.logger.info(
        'Successfully dropped distributed_package_standard_versions table',
      );

      // Drop distributed_packages table
      await queryRunner.dropForeignKey(
        'distributed_packages',
        this.distributedPackagesPackageFK,
      );
      await queryRunner.dropForeignKey(
        'distributed_packages',
        this.distributedPackagesDistributionFK,
      );
      await queryRunner.dropIndex(
        'distributed_packages',
        'idx_distributed_packages_unique',
      );
      await queryRunner.dropIndex(
        'distributed_packages',
        'idx_distributed_packages_distribution',
      );
      await queryRunner.dropTable('distributed_packages', true);

      this.logger.info('Successfully dropped distributed_packages table');

      // Drop distributions table
      await queryRunner.dropForeignKey(
        'distributions',
        this.distributionsOrganizationFK,
      );
      await queryRunner.dropForeignKey(
        'distributions',
        this.distributionsTargetFK,
      );
      await queryRunner.dropForeignKey(
        'distributions',
        this.distributionsGitCommitFK,
      );
      await queryRunner.dropIndex('distributions', 'idx_distributions_target');
      await queryRunner.dropIndex(
        'distributions',
        'idx_distributions_organization',
      );
      await queryRunner.dropTable('distributions', true);

      this.logger.info('Successfully dropped distributions table');

      this.logger.info(
        'Rollback CreateDistributionTables completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateDistributionTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
