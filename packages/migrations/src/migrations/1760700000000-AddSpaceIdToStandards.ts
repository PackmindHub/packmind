import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddSpaceIdToStandards1760700000000';

export class AddSpaceIdToStandards1760700000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly spaceIdColumn = new TableColumn({
    name: 'space_id',
    type: 'uuid',
    isNullable: true,
  });

  private readonly standardSpaceForeignKey = new TableForeignKey({
    name: 'FK_standard_space',
    columnNames: ['space_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'spaces',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSpaceIdToStandards');

    try {
      this.logger.debug('Adding space_id column to standards table');
      await queryRunner.addColumn('standards', this.spaceIdColumn);
      this.logger.info('Successfully added space_id column to standards table');

      this.logger.debug('Adding foreign key to standards table');
      await queryRunner.createForeignKey(
        'standards',
        this.standardSpaceForeignKey,
      );
      this.logger.info('Successfully added foreign key to standards table');

      this.logger.debug('Creating index on standards.space_id');
      await queryRunner.query(
        'CREATE INDEX "idx_standard_space" ON "standards" ("space_id")',
      );
      this.logger.info('Successfully created index on standards.space_id');

      this.logger.info(
        'Migration AddSpaceIdToStandards completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddSpaceIdToStandards failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSpaceIdToStandards');

    try {
      this.logger.debug('Dropping index from standards table');
      await queryRunner.query('DROP INDEX "idx_standard_space"');
      this.logger.info('Successfully dropped index from standards table');

      this.logger.debug('Dropping foreign key from standards table');
      await queryRunner.dropForeignKey(
        'standards',
        this.standardSpaceForeignKey,
      );
      this.logger.info('Successfully dropped foreign key from standards table');

      this.logger.debug('Dropping space_id column from standards table');
      await queryRunner.dropColumn('standards', this.spaceIdColumn);
      this.logger.info(
        'Successfully dropped space_id column from standards table',
      );

      this.logger.info('Rollback AddSpaceIdToStandards completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddSpaceIdToStandards failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
