import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddCreatedByUpdatedByToUserSpaceMemberships1775100000000';

export class AddCreatedByUpdatedByToUserSpaceMemberships1775100000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly createdByForeignKey = new TableForeignKey({
    name: 'FK_user_space_memberships_created_by',
    columnNames: ['created_by'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly updatedByForeignKey = new TableForeignKey({
    name: 'FK_user_space_memberships_updated_by',
    columnNames: ['updated_by'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddCreatedByUpdatedByToUserSpaceMemberships',
    );

    try {
      this.logger.debug('Adding created_by column');
      await queryRunner.query(
        `ALTER TABLE "user_space_memberships" ADD COLUMN "created_by" uuid`,
      );

      this.logger.debug('Adding updated_by column');
      await queryRunner.query(
        `ALTER TABLE "user_space_memberships" ADD COLUMN "updated_by" uuid`,
      );

      this.logger.debug('Backfilling created_by and updated_by from user_id');
      await queryRunner.query(
        `UPDATE "user_space_memberships" SET "created_by" = "user_id", "updated_by" = "user_id"`,
      );

      this.logger.debug('Setting created_by to NOT NULL');
      await queryRunner.query(
        `ALTER TABLE "user_space_memberships" ALTER COLUMN "created_by" SET NOT NULL`,
      );

      this.logger.debug('Setting updated_by to NOT NULL');
      await queryRunner.query(
        `ALTER TABLE "user_space_memberships" ALTER COLUMN "updated_by" SET NOT NULL`,
      );

      this.logger.debug('Adding foreign key for created_by');
      await queryRunner.createForeignKey(
        'user_space_memberships',
        this.createdByForeignKey,
      );

      this.logger.debug('Adding foreign key for updated_by');
      await queryRunner.createForeignKey(
        'user_space_memberships',
        this.updatedByForeignKey,
      );

      this.logger.info(
        'Migration AddCreatedByUpdatedByToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddCreatedByUpdatedByToUserSpaceMemberships failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddCreatedByUpdatedByToUserSpaceMemberships',
    );

    try {
      this.logger.debug('Dropping foreign key for updated_by');
      await queryRunner.dropForeignKey(
        'user_space_memberships',
        this.updatedByForeignKey,
      );

      this.logger.debug('Dropping foreign key for created_by');
      await queryRunner.dropForeignKey(
        'user_space_memberships',
        this.createdByForeignKey,
      );

      this.logger.debug('Dropping updated_by column');
      await queryRunner.query(
        `ALTER TABLE "user_space_memberships" DROP COLUMN "updated_by"`,
      );

      this.logger.debug('Dropping created_by column');
      await queryRunner.query(
        `ALTER TABLE "user_space_memberships" DROP COLUMN "created_by"`,
      );

      this.logger.info(
        'Rollback AddCreatedByUpdatedByToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddCreatedByUpdatedByToUserSpaceMemberships failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
