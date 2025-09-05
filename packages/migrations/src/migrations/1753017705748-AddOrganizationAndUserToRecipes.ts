import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddOrganizationAndUserToRecipes1753017705748';

export class AddOrganizationAndUserToRecipes1753017705748
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly organizationIdColumn = new TableColumn({
    name: 'organization_id',
    type: 'uuid',
    isNullable: true, // Initially allow null for existing records
  });

  private readonly userIdColumn = new TableColumn({
    name: 'user_id',
    type: 'uuid',
    isNullable: true, // Initially allow null for existing records
  });

  private readonly organizationForeignKey = new TableForeignKey({
    name: 'FK_recipe_organization',
    columnNames: ['organization_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'organizations',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  private readonly userForeignKey = new TableForeignKey({
    name: 'FK_recipe_user',
    columnNames: ['user_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'users',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddOrganizationAndUserToRecipes');

    try {
      // Add organization_id column
      this.logger.debug('Adding organization_id column to recipes table');
      await queryRunner.addColumn('recipes', this.organizationIdColumn);
      this.logger.info(
        'Successfully added organization_id column to recipes table',
      );

      // Add user_id column
      this.logger.debug('Adding user_id column to recipes table');
      await queryRunner.addColumn('recipes', this.userIdColumn);
      this.logger.info('Successfully added user_id column to recipes table');

      // Update existing recipes to link to first organization and first user from that organization
      this.logger.debug(
        'Updating existing recipes with organization and user IDs',
      );
      await queryRunner.query(`
        UPDATE recipes SET 
          organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1),
          user_id = (
            SELECT u.id FROM users u 
            WHERE u.organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) 
            ORDER BY u.created_at LIMIT 1
          )
        WHERE organization_id IS NULL OR user_id IS NULL
      `);
      this.logger.info(
        'Successfully updated existing recipes with organization and user IDs',
      );

      // Make columns NOT NULL
      this.logger.debug('Making organization_id and user_id columns NOT NULL');
      await queryRunner.query(
        'ALTER TABLE "recipes" ALTER COLUMN "organization_id" SET NOT NULL',
      );
      await queryRunner.query(
        'ALTER TABLE "recipes" ALTER COLUMN "user_id" SET NOT NULL',
      );
      this.logger.info(
        'Successfully made organization_id and user_id columns NOT NULL',
      );

      // Add foreign key constraints
      this.logger.debug('Adding foreign key constraint for organization');
      await queryRunner.createForeignKey(
        'recipes',
        this.organizationForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint for organization',
      );

      this.logger.debug('Adding foreign key constraint for user');
      await queryRunner.createForeignKey('recipes', this.userForeignKey);
      this.logger.info('Successfully added foreign key constraint for user');

      // Add indices for performance
      this.logger.debug('Creating indices on organization_id and user_id');
      await queryRunner.query(
        'CREATE INDEX "idx_recipe_organization" ON "recipes" ("organization_id")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_recipe_user" ON "recipes" ("user_id")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_recipe_org_user" ON "recipes" ("organization_id", "user_id")',
      );
      this.logger.info(
        'Successfully created indices on organization_id and user_id',
      );

      this.logger.info(
        'Migration AddOrganizationAndUserToRecipes completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddOrganizationAndUserToRecipes failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddOrganizationAndUserToRecipes');

    try {
      // Drop indices
      this.logger.debug('Dropping indices from recipes table');
      await queryRunner.query('DROP INDEX "idx_recipe_org_user"');
      await queryRunner.query('DROP INDEX "idx_recipe_user"');
      await queryRunner.query('DROP INDEX "idx_recipe_organization"');
      this.logger.info('Successfully dropped indices from recipes table');

      // Drop foreign key constraints
      this.logger.debug('Dropping foreign key constraints from recipes table');
      await queryRunner.dropForeignKey('recipes', this.userForeignKey);
      await queryRunner.dropForeignKey('recipes', this.organizationForeignKey);
      this.logger.info(
        'Successfully dropped foreign key constraints from recipes table',
      );

      // Drop columns
      this.logger.debug('Dropping user_id column from recipes table');
      await queryRunner.dropColumn('recipes', 'user_id');
      this.logger.info(
        'Successfully dropped user_id column from recipes table',
      );

      this.logger.debug('Dropping organization_id column from recipes table');
      await queryRunner.dropColumn('recipes', 'organization_id');
      this.logger.info(
        'Successfully dropped organization_id column from recipes table',
      );

      this.logger.info(
        'Rollback AddOrganizationAndUserToRecipes completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddOrganizationAndUserToRecipes failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
