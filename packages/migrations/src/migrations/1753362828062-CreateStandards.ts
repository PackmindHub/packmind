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
} from '@packmind/shared/src/database/migrationColumns';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateStandards1753362828062';

export class CreateStandards1753362828062 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // Table definitions
  private readonly standardsTable = new Table({
    name: 'standards',
    columns: [
      uuidMigrationColumn,
      {
        name: 'name',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'slug',
        type: 'varchar',
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
        name: 'git_commit_id',
        type: 'uuid',
        isNullable: true,
      },
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly standardVersionsTable = new Table({
    name: 'standard_versions',
    columns: [
      uuidMigrationColumn,
      {
        name: 'name',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'slug',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'description',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'standard_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'version',
        type: 'integer',
        isNullable: false,
      },
      {
        name: 'git_commit_id',
        type: 'uuid',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly rulesTable = new Table({
    name: 'rules',
    columns: [
      uuidMigrationColumn,
      {
        name: 'content',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'standard_version_id',
        type: 'uuid',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly standardDeploymentsTable = new Table({
    name: 'standard_deployments',
    columns: [
      uuidMigrationColumn,
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
      ...timestampsMigrationColumns,
    ],
  });

  // Join tables
  private readonly standardDeploymentVersionsTable = new Table({
    name: 'standard_deployment_versions',
    columns: [
      {
        name: 'standard_deployment_id',
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

  private readonly standardDeploymentGitReposTable = new Table({
    name: 'standard_deployment_git_repos',
    columns: [
      {
        name: 'standard_deployment_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'git_repo_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly standardDeploymentGitCommitsTable = new Table({
    name: 'standard_deployment_git_commits',
    columns: [
      {
        name: 'standard_deployment_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'git_commit_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  // Foreign key definitions
  private readonly standardsOrganizationForeignKey = new TableForeignKey({
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_standards_organization',
  });

  private readonly standardsGitCommitForeignKey = new TableForeignKey({
    columnNames: ['git_commit_id'],
    referencedTableName: 'git_commits',
    referencedColumnNames: ['id'],
    onDelete: 'SET NULL',
    name: 'FK_standards_git_commit',
  });

  private readonly standardVersionsStandardForeignKey = new TableForeignKey({
    columnNames: ['standard_id'],
    referencedTableName: 'standards',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_standard_versions_standard',
  });

  private readonly standardVersionsGitCommitForeignKey = new TableForeignKey({
    columnNames: ['git_commit_id'],
    referencedTableName: 'git_commits',
    referencedColumnNames: ['id'],
    onDelete: 'SET NULL',
    name: 'FK_standard_versions_git_commit',
  });

  private readonly rulesStandardVersionForeignKey = new TableForeignKey({
    columnNames: ['standard_version_id'],
    referencedTableName: 'standard_versions',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_rules_standard_version',
  });

  private readonly standardDeploymentsOrganizationForeignKey =
    new TableForeignKey({
      columnNames: ['organization_id'],
      referencedTableName: 'organizations',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_standard_deployments_organization',
    });

  // Join table foreign keys
  private readonly standardDeploymentVersionsDeploymentForeignKey =
    new TableForeignKey({
      columnNames: ['standard_deployment_id'],
      referencedTableName: 'standard_deployments',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_standard_deployment_versions_deployment',
    });

  private readonly standardDeploymentVersionsVersionForeignKey =
    new TableForeignKey({
      columnNames: ['standard_version_id'],
      referencedTableName: 'standard_versions',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_standard_deployment_versions_version',
    });

  private readonly standardDeploymentGitReposDeploymentForeignKey =
    new TableForeignKey({
      columnNames: ['standard_deployment_id'],
      referencedTableName: 'standard_deployments',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_standard_deployment_git_repos_deployment',
    });

  private readonly standardDeploymentGitReposRepoForeignKey =
    new TableForeignKey({
      columnNames: ['git_repo_id'],
      referencedTableName: 'git_repos',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_standard_deployment_git_repos_repo',
    });

  private readonly standardDeploymentGitCommitsDeploymentForeignKey =
    new TableForeignKey({
      columnNames: ['standard_deployment_id'],
      referencedTableName: 'standard_deployments',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_standard_deployment_git_commits_deployment',
    });

  private readonly standardDeploymentGitCommitsCommitForeignKey =
    new TableForeignKey({
      columnNames: ['git_commit_id'],
      referencedTableName: 'git_commits',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_standard_deployment_git_commits_commit',
    });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateStandards');

    try {
      // Create main tables
      this.logger.debug('Creating standards table');
      await queryRunner.createTable(this.standardsTable);
      this.logger.info('Successfully created standards table');

      this.logger.debug('Creating standard_versions table');
      await queryRunner.createTable(this.standardVersionsTable);
      this.logger.info('Successfully created standard_versions table');

      this.logger.debug('Creating rules table');
      await queryRunner.createTable(this.rulesTable);
      this.logger.info('Successfully created rules table');

      this.logger.debug('Creating standard_deployments table');
      await queryRunner.createTable(this.standardDeploymentsTable);
      this.logger.info('Successfully created standard_deployments table');

      // Create join tables
      this.logger.debug('Creating standard_deployment_versions join table');
      await queryRunner.createTable(this.standardDeploymentVersionsTable);
      this.logger.info(
        'Successfully created standard_deployment_versions join table',
      );

      this.logger.debug('Creating standard_deployment_git_repos join table');
      await queryRunner.createTable(this.standardDeploymentGitReposTable);
      this.logger.info(
        'Successfully created standard_deployment_git_repos join table',
      );

      this.logger.debug('Creating standard_deployment_git_commits join table');
      await queryRunner.createTable(this.standardDeploymentGitCommitsTable);
      this.logger.info(
        'Successfully created standard_deployment_git_commits join table',
      );

      // Create indices
      this.logger.debug('Creating indices for standards table');
      await queryRunner.createIndex(
        'standards',
        new TableIndex({
          name: 'idx_standard_organization',
          columnNames: ['organization_id'],
        }),
      );
      await queryRunner.createIndex(
        'standards',
        new TableIndex({
          name: 'idx_standard_user',
          columnNames: ['user_id'],
        }),
      );
      await queryRunner.createIndex(
        'standards',
        new TableIndex({
          name: 'idx_standard_org_user',
          columnNames: ['organization_id', 'user_id'],
        }),
      );
      await queryRunner.createIndex(
        'standards',
        new TableIndex({
          name: 'idx_standard_slug',
          columnNames: ['slug'],
          isUnique: true,
        }),
      );
      this.logger.info('Successfully created indices for standards table');

      this.logger.debug('Creating indices for standard_versions table');
      await queryRunner.createIndex(
        'standard_versions',
        new TableIndex({
          name: 'idx_standard_version_standard',
          columnNames: ['standard_id'],
        }),
      );
      await queryRunner.createIndex(
        'standard_versions',
        new TableIndex({
          name: 'idx_standard_version_unique',
          columnNames: ['standard_id', 'version'],
          isUnique: true,
        }),
      );
      this.logger.info(
        'Successfully created indices for standard_versions table',
      );

      this.logger.debug('Creating indices for rules table');
      await queryRunner.createIndex(
        'rules',
        new TableIndex({
          name: 'idx_rule_standard_version',
          columnNames: ['standard_version_id'],
        }),
      );
      this.logger.info('Successfully created indices for rules table');

      this.logger.debug('Creating indices for standard_deployments table');
      await queryRunner.createIndex(
        'standard_deployments',
        new TableIndex({
          name: 'idx_standard_deployment_organization',
          columnNames: ['organization_id'],
        }),
      );
      await queryRunner.createIndex(
        'standard_deployments',
        new TableIndex({
          name: 'idx_standard_deployment_author',
          columnNames: ['author_id'],
        }),
      );
      this.logger.info(
        'Successfully created indices for standard_deployments table',
      );

      this.logger.debug('Creating indices for join tables');
      await queryRunner.createIndex(
        'standard_deployment_versions',
        new TableIndex({
          name: 'idx_standard_deployment_version_unique',
          columnNames: ['standard_deployment_id', 'standard_version_id'],
          isUnique: true,
        }),
      );
      await queryRunner.createIndex(
        'standard_deployment_git_repos',
        new TableIndex({
          name: 'idx_standard_deployment_git_repo_unique',
          columnNames: ['standard_deployment_id', 'git_repo_id'],
          isUnique: true,
        }),
      );
      await queryRunner.createIndex(
        'standard_deployment_git_commits',
        new TableIndex({
          name: 'idx_standard_deployment_git_commit_unique',
          columnNames: ['standard_deployment_id', 'git_commit_id'],
          isUnique: true,
        }),
      );
      this.logger.info('Successfully created indices for join tables');

      // Create foreign keys for main tables
      this.logger.debug('Adding foreign key constraints for standards table');
      await queryRunner.createForeignKey(
        'standards',
        this.standardsOrganizationForeignKey,
      );
      await queryRunner.createForeignKey(
        'standards',
        this.standardsGitCommitForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for standards table',
      );

      this.logger.debug(
        'Adding foreign key constraints for standard_versions table',
      );
      await queryRunner.createForeignKey(
        'standard_versions',
        this.standardVersionsStandardForeignKey,
      );
      await queryRunner.createForeignKey(
        'standard_versions',
        this.standardVersionsGitCommitForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for standard_versions table',
      );

      this.logger.debug('Adding foreign key constraints for rules table');
      await queryRunner.createForeignKey(
        'rules',
        this.rulesStandardVersionForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for rules table',
      );

      this.logger.debug(
        'Adding foreign key constraints for standard_deployments table',
      );
      await queryRunner.createForeignKey(
        'standard_deployments',
        this.standardDeploymentsOrganizationForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for standard_deployments table',
      );

      // Create foreign keys for join tables
      this.logger.debug(
        'Adding foreign key constraints for standard_deployment_versions table',
      );
      await queryRunner.createForeignKey(
        'standard_deployment_versions',
        this.standardDeploymentVersionsDeploymentForeignKey,
      );
      await queryRunner.createForeignKey(
        'standard_deployment_versions',
        this.standardDeploymentVersionsVersionForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for standard_deployment_versions table',
      );

      this.logger.debug(
        'Adding foreign key constraints for standard_deployment_git_repos table',
      );
      await queryRunner.createForeignKey(
        'standard_deployment_git_repos',
        this.standardDeploymentGitReposDeploymentForeignKey,
      );
      await queryRunner.createForeignKey(
        'standard_deployment_git_repos',
        this.standardDeploymentGitReposRepoForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for standard_deployment_git_repos table',
      );

      this.logger.debug(
        'Adding foreign key constraints for standard_deployment_git_commits table',
      );
      await queryRunner.createForeignKey(
        'standard_deployment_git_commits',
        this.standardDeploymentGitCommitsDeploymentForeignKey,
      );
      await queryRunner.createForeignKey(
        'standard_deployment_git_commits',
        this.standardDeploymentGitCommitsCommitForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for standard_deployment_git_commits table',
      );

      this.logger.info('Migration CreateStandards completed successfully');
    } catch (error) {
      this.logger.error('Migration CreateStandards failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateStandards');

    try {
      // Drop foreign keys for join tables first
      this.logger.debug(
        'Dropping foreign key constraints for standard_deployment_git_commits table',
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_git_commits',
        this.standardDeploymentGitCommitsCommitForeignKey,
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_git_commits',
        this.standardDeploymentGitCommitsDeploymentForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for standard_deployment_git_commits table',
      );

      this.logger.debug(
        'Dropping foreign key constraints for standard_deployment_git_repos table',
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_git_repos',
        this.standardDeploymentGitReposRepoForeignKey,
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_git_repos',
        this.standardDeploymentGitReposDeploymentForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for standard_deployment_git_repos table',
      );

      this.logger.debug(
        'Dropping foreign key constraints for standard_deployment_versions table',
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_versions',
        this.standardDeploymentVersionsVersionForeignKey,
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_versions',
        this.standardDeploymentVersionsDeploymentForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for standard_deployment_versions table',
      );

      // Drop foreign keys for main tables
      this.logger.debug(
        'Dropping foreign key constraints for standard_deployments table',
      );
      await queryRunner.dropForeignKey(
        'standard_deployments',
        this.standardDeploymentsOrganizationForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for standard_deployments table',
      );

      this.logger.debug('Dropping foreign key constraints for rules table');
      await queryRunner.dropForeignKey(
        'rules',
        this.rulesStandardVersionForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for rules table',
      );

      this.logger.debug(
        'Dropping foreign key constraints for standard_versions table',
      );
      await queryRunner.dropForeignKey(
        'standard_versions',
        this.standardVersionsGitCommitForeignKey,
      );
      await queryRunner.dropForeignKey(
        'standard_versions',
        this.standardVersionsStandardForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for standard_versions table',
      );

      this.logger.debug('Dropping foreign key constraints for standards table');
      await queryRunner.dropForeignKey(
        'standards',
        this.standardsGitCommitForeignKey,
      );
      await queryRunner.dropForeignKey(
        'standards',
        this.standardsOrganizationForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for standards table',
      );

      // Drop indices for join tables
      this.logger.debug('Dropping indices for join tables');
      await queryRunner.dropIndex(
        'standard_deployment_git_commits',
        'idx_standard_deployment_git_commit_unique',
      );
      await queryRunner.dropIndex(
        'standard_deployment_git_repos',
        'idx_standard_deployment_git_repo_unique',
      );
      await queryRunner.dropIndex(
        'standard_deployment_versions',
        'idx_standard_deployment_version_unique',
      );
      this.logger.info('Successfully dropped indices for join tables');

      // Drop indices for main tables
      this.logger.debug('Dropping indices for standard_deployments table');
      await queryRunner.dropIndex(
        'standard_deployments',
        'idx_standard_deployment_author',
      );
      await queryRunner.dropIndex(
        'standard_deployments',
        'idx_standard_deployment_organization',
      );
      this.logger.info(
        'Successfully dropped indices for standard_deployments table',
      );

      this.logger.debug('Dropping indices for rules table');
      await queryRunner.dropIndex('rules', 'idx_rule_standard_version');
      this.logger.info('Successfully dropped indices for rules table');

      this.logger.debug('Dropping indices for standard_versions table');
      await queryRunner.dropIndex(
        'standard_versions',
        'idx_standard_version_unique',
      );
      await queryRunner.dropIndex(
        'standard_versions',
        'idx_standard_version_standard',
      );
      this.logger.info(
        'Successfully dropped indices for standard_versions table',
      );

      this.logger.debug('Dropping indices for standards table');
      await queryRunner.dropIndex('standards', 'idx_standard_slug');
      await queryRunner.dropIndex('standards', 'idx_standard_org_user');
      await queryRunner.dropIndex('standards', 'idx_standard_user');
      await queryRunner.dropIndex('standards', 'idx_standard_organization');
      this.logger.info('Successfully dropped indices for standards table');

      // Drop join tables
      this.logger.debug('Dropping standard_deployment_git_commits join table');
      await queryRunner.dropTable('standard_deployment_git_commits', true);
      this.logger.info(
        'Successfully dropped standard_deployment_git_commits join table',
      );

      this.logger.debug('Dropping standard_deployment_git_repos join table');
      await queryRunner.dropTable('standard_deployment_git_repos', true);
      this.logger.info(
        'Successfully dropped standard_deployment_git_repos join table',
      );

      this.logger.debug('Dropping standard_deployment_versions join table');
      await queryRunner.dropTable('standard_deployment_versions', true);
      this.logger.info(
        'Successfully dropped standard_deployment_versions join table',
      );

      // Drop main tables in reverse dependency order
      this.logger.debug('Dropping standard_deployments table');
      await queryRunner.dropTable('standard_deployments', true);
      this.logger.info('Successfully dropped standard_deployments table');

      this.logger.debug('Dropping rules table');
      await queryRunner.dropTable('rules', true);
      this.logger.info('Successfully dropped rules table');

      this.logger.debug('Dropping standard_versions table');
      await queryRunner.dropTable('standard_versions', true);
      this.logger.info('Successfully dropped standard_versions table');

      this.logger.debug('Dropping standards table');
      await queryRunner.dropTable('standards', true);
      this.logger.info('Successfully dropped standards table');

      this.logger.info('Rollback CreateStandards completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreateStandards failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
