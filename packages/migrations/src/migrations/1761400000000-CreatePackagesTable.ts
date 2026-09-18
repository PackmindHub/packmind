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

const origin = 'CreatePackagesTable1761400000000';

export class CreatePackagesTable1761400000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly packagesTable = new Table({
    name: 'packages',
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
        name: 'space_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'created_by',
        type: 'varchar',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly packageRecipesTable = new Table({
    name: 'package_recipes',
    columns: [
      {
        name: 'package_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'recipe_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly packageStandardsTable = new Table({
    name: 'package_standards',
    columns: [
      {
        name: 'package_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'standard_id',
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  private readonly packagesSpaceForeignKey = new TableForeignKey({
    columnNames: ['space_id'],
    referencedTableName: 'spaces',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_packages_space',
  });

  private readonly packageRecipesPackageForeignKey = new TableForeignKey({
    columnNames: ['package_id'],
    referencedTableName: 'packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_package_recipes_package',
  });

  private readonly packageRecipesRecipeForeignKey = new TableForeignKey({
    columnNames: ['recipe_id'],
    referencedTableName: 'recipes',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_package_recipes_recipe',
  });

  private readonly packageStandardsPackageForeignKey = new TableForeignKey({
    columnNames: ['package_id'],
    referencedTableName: 'packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_package_standards_package',
  });

  private readonly packageStandardsStandardForeignKey = new TableForeignKey({
    columnNames: ['standard_id'],
    referencedTableName: 'standards',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_package_standards_standard',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreatePackagesTable');

    try {
      this.logger.debug('Creating packages table');
      await queryRunner.createTable(this.packagesTable);
      this.logger.info('Successfully created packages table');

      this.logger.debug('Creating index on space_id');
      await queryRunner.createIndex(
        'packages',
        new TableIndex({
          name: 'idx_packages_space',
          columnNames: ['space_id'],
        }),
      );
      this.logger.info('Successfully created index on space_id');

      this.logger.debug('Creating unique index on slug');
      await queryRunner.createIndex(
        'packages',
        new TableIndex({
          name: 'idx_packages_slug',
          columnNames: ['slug'],
          isUnique: true,
        }),
      );
      this.logger.info('Successfully created unique index on slug');

      this.logger.debug('Adding foreign key constraint to spaces table');
      await queryRunner.createForeignKey(
        'packages',
        this.packagesSpaceForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint to spaces table',
      );

      this.logger.debug('Creating package_recipes join table');
      await queryRunner.createTable(this.packageRecipesTable);
      this.logger.info('Successfully created package_recipes join table');

      this.logger.debug('Creating unique index on package_recipes');
      await queryRunner.createIndex(
        'package_recipes',
        new TableIndex({
          name: 'idx_package_recipes_unique',
          columnNames: ['package_id', 'recipe_id'],
          isUnique: true,
        }),
      );
      this.logger.info('Successfully created unique index on package_recipes');

      this.logger.debug(
        'Adding foreign key constraints to package_recipes table',
      );
      await queryRunner.createForeignKey(
        'package_recipes',
        this.packageRecipesPackageForeignKey,
      );
      await queryRunner.createForeignKey(
        'package_recipes',
        this.packageRecipesRecipeForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints to package_recipes table',
      );

      this.logger.debug('Creating package_standards join table');
      await queryRunner.createTable(this.packageStandardsTable);
      this.logger.info('Successfully created package_standards join table');

      this.logger.debug('Creating unique index on package_standards');
      await queryRunner.createIndex(
        'package_standards',
        new TableIndex({
          name: 'idx_package_standards_unique',
          columnNames: ['package_id', 'standard_id'],
          isUnique: true,
        }),
      );
      this.logger.info(
        'Successfully created unique index on package_standards',
      );

      this.logger.debug(
        'Adding foreign key constraints to package_standards table',
      );
      await queryRunner.createForeignKey(
        'package_standards',
        this.packageStandardsPackageForeignKey,
      );
      await queryRunner.createForeignKey(
        'package_standards',
        this.packageStandardsStandardForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints to package_standards table',
      );

      this.logger.info('Migration CreatePackagesTable completed successfully');
    } catch (error) {
      this.logger.error('Migration CreatePackagesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreatePackagesTable');

    try {
      this.logger.debug(
        'Dropping foreign key constraints from package_standards table',
      );
      await queryRunner.dropForeignKey(
        'package_standards',
        this.packageStandardsStandardForeignKey,
      );
      await queryRunner.dropForeignKey(
        'package_standards',
        this.packageStandardsPackageForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints from package_standards table',
      );

      this.logger.debug('Dropping index on package_standards');
      await queryRunner.dropIndex(
        'package_standards',
        'idx_package_standards_unique',
      );
      this.logger.info('Successfully dropped index on package_standards');

      this.logger.debug('Dropping package_standards table');
      await queryRunner.dropTable('package_standards', true);
      this.logger.info('Successfully dropped package_standards table');

      this.logger.debug(
        'Dropping foreign key constraints from package_recipes table',
      );
      await queryRunner.dropForeignKey(
        'package_recipes',
        this.packageRecipesRecipeForeignKey,
      );
      await queryRunner.dropForeignKey(
        'package_recipes',
        this.packageRecipesPackageForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints from package_recipes table',
      );

      this.logger.debug('Dropping index on package_recipes');
      await queryRunner.dropIndex(
        'package_recipes',
        'idx_package_recipes_unique',
      );
      this.logger.info('Successfully dropped index on package_recipes');

      this.logger.debug('Dropping package_recipes table');
      await queryRunner.dropTable('package_recipes', true);
      this.logger.info('Successfully dropped package_recipes table');

      this.logger.debug('Dropping foreign key constraint from packages table');
      await queryRunner.dropForeignKey(
        'packages',
        this.packagesSpaceForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint from packages table',
      );

      this.logger.debug('Dropping indices on packages');
      await queryRunner.dropIndex('packages', 'idx_packages_slug');
      await queryRunner.dropIndex('packages', 'idx_packages_space');
      this.logger.info('Successfully dropped indices on packages');

      this.logger.debug('Dropping packages table');
      await queryRunner.dropTable('packages', true);
      this.logger.info('Successfully dropped packages table');

      this.logger.info('Rollback CreatePackagesTable completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreatePackagesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
