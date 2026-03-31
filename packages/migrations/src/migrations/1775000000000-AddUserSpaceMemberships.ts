import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { timestampsMigrationColumns } from '@packmind/node-utils';

const origin = 'AddUserSpaceMemberships1775000000000';

export class AddUserSpaceMemberships1775000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly membershipTable = new Table({
    name: 'user_space_memberships',
    columns: [
      {
        name: 'user_id',
        type: 'uuid',
        isPrimary: true,
        isNullable: false,
      },
      {
        name: 'space_id',
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

  private readonly userForeignKey = new TableForeignKey({
    name: 'FK_user_space_memberships_user',
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly spaceForeignKey = new TableForeignKey({
    name: 'FK_user_space_memberships_space',
    columnNames: ['space_id'],
    referencedTableName: 'spaces',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddUserSpaceMemberships');

    try {
      this.logger.debug('Creating user_space_memberships table');
      await queryRunner.createTable(this.membershipTable, true);

      this.logger.debug('Adding foreign key user -> space memberships');
      await queryRunner.createForeignKey(
        'user_space_memberships',
        this.userForeignKey,
      );

      this.logger.debug('Adding foreign key space -> space memberships');
      await queryRunner.createForeignKey(
        'user_space_memberships',
        this.spaceForeignKey,
      );

      this.logger.debug(
        'Backfilling space memberships from organization memberships',
      );
      await queryRunner.query(`
        INSERT INTO "user_space_memberships" (
          "user_id",
          "space_id",
          "role",
          "created_at",
          "updated_at"
        )
        SELECT
          uom."user_id",
          s."id" AS space_id,
          uom."role",
          NOW(),
          NOW()
        FROM "user_organization_memberships" uom
        INNER JOIN "spaces" s ON s."organization_id" = uom."organization_id"
        WHERE s."deleted_at" IS NULL
      `);

      this.logger.info(
        'Migration AddUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddUserSpaceMemberships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddUserSpaceMemberships');

    try {
      this.logger.debug('Dropping foreign keys');
      await queryRunner.dropForeignKey(
        'user_space_memberships',
        this.userForeignKey,
      );
      await queryRunner.dropForeignKey(
        'user_space_memberships',
        this.spaceForeignKey,
      );

      this.logger.debug('Dropping user_space_memberships table');
      await queryRunner.dropTable('user_space_memberships');

      this.logger.info(
        'Rollback AddUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddUserSpaceMemberships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
