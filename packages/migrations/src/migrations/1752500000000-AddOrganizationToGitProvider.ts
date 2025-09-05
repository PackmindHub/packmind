import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddOrganizationToGitProvider1752500000000';

export class AddOrganizationToGitProvider1752500000000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly organizationIdColumn = new TableColumn({
    name: 'organizationId',
    type: 'uuid',
    isNullable: true, // Initially allow null for existing records
  });

  private readonly foreignKey = new TableForeignKey({
    columnNames: ['organizationId'],
    referencedColumnNames: ['id'],
    referencedTableName: 'organizations',
    onDelete: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddOrganizationToGitProvider');

    try {
      this.logger.debug('Adding organizationId column to git_providers table');
      await queryRunner.addColumn('git_providers', this.organizationIdColumn);
      this.logger.info(
        'Successfully added organizationId column to git_providers table',
      );

      this.logger.debug('Adding foreign key to git_providers table');
      await queryRunner.createForeignKey('git_providers', this.foreignKey);
      this.logger.info('Successfully added foreign key to git_providers table');

      this.logger.info(
        'Migration AddOrganizationToGitProvider completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddOrganizationToGitProvider failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddOrganizationToGitProvider');

    try {
      this.logger.debug('Dropping foreign key from git_providers table');
      await queryRunner.dropForeignKey('git_providers', this.foreignKey);
      this.logger.info(
        'Successfully dropped foreign key from git_providers table',
      );

      this.logger.debug(
        'Dropping organizationId column from git_providers table',
      );
      await queryRunner.dropColumn('git_providers', 'organizationId');
      this.logger.info(
        'Successfully dropped organizationId column from git_providers table',
      );

      this.logger.info(
        'Rollback AddOrganizationToGitProvider completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddOrganizationToGitProvider failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
