import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/shared/src/database/migrationColumns';

const origin = 'CreateInvitationsAndUserActivation1758800000000';

export class CreateInvitationsAndUserActivation1758800000000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly invitationsTable = new Table({
    name: 'invitations',
    columns: [
      uuidMigrationColumn,
      {
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'token',
        type: 'varchar',
        length: '512',
        isNullable: false,
        isUnique: true,
      },
      {
        name: 'expiration_date',
        type: 'timestamptz',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly invitationUserForeignKey = new TableForeignKey({
    name: 'FK_invitations_user',
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly invitationUserIndex = new TableIndex({
    name: 'IDX_invitations_user_id',
    columnNames: ['user_id'],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateInvitationsAndUserActivation');

    try {
      this.logger.debug('Allowing null password hashes for users');
      await queryRunner.query(
        'ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL',
      );

      this.logger.debug('Adding active flag to users table');
      await queryRunner.query(
        'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active" boolean NOT NULL DEFAULT true',
      );

      this.logger.debug('Creating invitations table');
      await queryRunner.createTable(this.invitationsTable, true);

      this.logger.debug('Adding foreign key invitations.user_id -> users.id');
      await queryRunner.createForeignKey(
        'invitations',
        this.invitationUserForeignKey,
      );

      this.logger.debug('Creating index on invitations.user_id');
      await queryRunner.createIndex('invitations', this.invitationUserIndex);

      this.logger.info(
        'Migration CreateInvitationsAndUserActivation completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateInvitationsAndUserActivation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateInvitationsAndUserActivation');

    try {
      this.logger.debug('Dropping index on invitations.user_id');
      await queryRunner.dropIndex('invitations', this.invitationUserIndex);

      this.logger.debug('Dropping foreign key invitations.user_id -> users.id');
      await queryRunner.dropForeignKey(
        'invitations',
        this.invitationUserForeignKey,
      );

      this.logger.debug('Dropping invitations table');
      await queryRunner.dropTable('invitations');

      this.logger.debug('Removing active flag from users table');
      await queryRunner.query(
        'ALTER TABLE "users" DROP COLUMN IF EXISTS "active"',
      );

      this.logger.debug('Restoring NOT NULL constraint on users.password_hash');
      await queryRunner.query(
        'ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL',
      );

      this.logger.info(
        'Rollback CreateInvitationsAndUserActivation completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateInvitationsAndUserActivation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
