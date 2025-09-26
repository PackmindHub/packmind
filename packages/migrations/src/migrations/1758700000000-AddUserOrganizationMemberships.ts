import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { timestampsMigrationColumns } from '@packmind/shared/src/database/migrationColumns';

const origin = 'AddUserOrganizationMemberships1758700000000';

export class AddUserOrganizationMemberships1758700000000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly membershipTable = new Table({
    name: 'user_organization_memberships',
    columns: [
      {
        name: 'user_id',
        type: 'uuid',
        isPrimary: true,
        isNullable: false,
      },
      {
        name: 'organization_id',
        type: 'uuid',
        isPrimary: true,
        isNullable: false,
      },
      {
        name: 'role',
        type: 'varchar',
        length: '64',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly membershipUserForeignKey = new TableForeignKey({
    name: 'FK_user_memberships_user',
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly membershipOrganizationForeignKey = new TableForeignKey({
    name: 'FK_user_memberships_organization',
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly legacyUserOrganizationForeignKey = new TableForeignKey({
    name: 'FK_user_organization',
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddUserOrganizationMemberships');

    try {
      this.logger.debug('Dropping legacy foreign key from users table');
      await queryRunner.query(
        'ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_user_organization"',
      );

      this.logger.debug('Dropping legacy users.organization_id index');
      await queryRunner.query('DROP INDEX IF EXISTS "idx_user_organization"');

      this.logger.debug('Creating user_organization_memberships table');
      await queryRunner.createTable(this.membershipTable, true);

      this.logger.debug('Adding foreign key user -> memberships');
      await queryRunner.createForeignKey(
        'user_organization_memberships',
        this.membershipUserForeignKey,
      );

      this.logger.debug('Adding foreign key organization -> memberships');
      await queryRunner.createForeignKey(
        'user_organization_memberships',
        this.membershipOrganizationForeignKey,
      );

      this.logger.debug('Backfilling memberships from users table');
      await queryRunner.query(`
        INSERT INTO "user_organization_memberships" (
          "user_id",
          "organization_id",
          "role",
          "created_at",
          "updated_at"
        )
        SELECT
          "id" AS user_id,
          "organization_id",
          'admin' AS role,
          COALESCE("created_at", NOW()),
          COALESCE("updated_at", NOW())
        FROM "users"
        WHERE "organization_id" IS NOT NULL
      `);

      this.logger.debug('Dropping legacy organization_id column from users');
      await queryRunner.query(
        'ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id"',
      );

      this.logger.info(
        'Migration AddUserOrganizationMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddUserOrganizationMemberships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddUserOrganizationMemberships');

    try {
      this.logger.debug('Adding organization_id column back to users table');
      await queryRunner.query(
        'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" uuid',
      );

      this.logger.debug(
        'Restoring users.organization_id values from memberships',
      );
      await queryRunner.query(`
        UPDATE "users" AS u
        SET "organization_id" = membership.organization_id
        FROM (
          SELECT DISTINCT ON ("user_id")
            "user_id",
            "organization_id"
          FROM "user_organization_memberships"
          ORDER BY "user_id", "created_at"
        ) AS membership
        WHERE membership.user_id = u."id"
      `);

      this.logger.debug('Enforcing NOT NULL on users.organization_id');
      await queryRunner.query(
        'ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL',
      );

      this.logger.debug(
        'Re-creating legacy foreign key on users.organization_id',
      );
      await queryRunner.createForeignKey(
        'users',
        this.legacyUserOrganizationForeignKey,
      );

      this.logger.debug('Re-creating legacy index on users.organization_id');
      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "idx_user_organization" ON "users" ("organization_id")',
      );

      this.logger.debug('Dropping memberships foreign keys');
      await queryRunner.dropForeignKey(
        'user_organization_memberships',
        this.membershipUserForeignKey,
      );
      await queryRunner.dropForeignKey(
        'user_organization_memberships',
        this.membershipOrganizationForeignKey,
      );

      this.logger.debug('Dropping user_organization_memberships table');
      await queryRunner.dropTable('user_organization_memberships');

      this.logger.info(
        'Rollback AddUserOrganizationMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddUserOrganizationMemberships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
