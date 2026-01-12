import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddDistributedPackageSkillVersionsTable1768227097175';

export class AddDistributedPackageSkillVersionsTable1768227097175 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly distributedPackageSkillVersionsTable = new Table({
    name: 'distributed_package_skill_versions',
    columns: [
      {
        name: 'distributed_package_id',
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

  private readonly dpskDistributedPackageFK = new TableForeignKey({
    columnNames: ['distributed_package_id'],
    referencedTableName: 'distributed_packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_dpskv_distributed_package',
  });

  private readonly dpskSkillVersionFK = new TableForeignKey({
    columnNames: ['skill_version_id'],
    referencedTableName: 'skill_versions',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_dpskv_skill_version',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddDistributedPackageSkillVersionsTable',
    );

    try {
      await queryRunner.createTable(this.distributedPackageSkillVersionsTable);

      await queryRunner.createIndex(
        'distributed_package_skill_versions',
        new TableIndex({
          name: 'idx_dpskv_unique',
          columnNames: ['distributed_package_id', 'skill_version_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'distributed_package_skill_versions',
        this.dpskDistributedPackageFK,
      );
      await queryRunner.createForeignKey(
        'distributed_package_skill_versions',
        this.dpskSkillVersionFK,
      );

      this.logger.info(
        'Successfully created distributed_package_skill_versions table',
      );

      this.logger.info(
        'Migration AddDistributedPackageSkillVersionsTable completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddDistributedPackageSkillVersionsTable failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddDistributedPackageSkillVersionsTable',
    );

    try {
      await queryRunner.dropForeignKey(
        'distributed_package_skill_versions',
        this.dpskSkillVersionFK,
      );
      await queryRunner.dropForeignKey(
        'distributed_package_skill_versions',
        this.dpskDistributedPackageFK,
      );
      await queryRunner.dropIndex(
        'distributed_package_skill_versions',
        'idx_dpskv_unique',
      );
      await queryRunner.dropTable('distributed_package_skill_versions', true);

      this.logger.info(
        'Successfully dropped distributed_package_skill_versions table',
      );

      this.logger.info(
        'Rollback AddDistributedPackageSkillVersionsTable completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddDistributedPackageSkillVersionsTable failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
