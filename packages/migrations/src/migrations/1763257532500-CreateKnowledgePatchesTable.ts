import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateKnowledgePatchesTable1763257532500';

export class CreateKnowledgePatchesTable1763257532500
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly knowledgePatchesTable = new Table({
    name: 'knowledge_patches',
    columns: [
      uuidMigrationColumn,
      {
        name: 'space_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'topic_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'patch_type',
        type: 'varchar',
        length: '50',
        isNullable: false,
      },
      {
        name: 'proposed_changes',
        type: 'jsonb',
        isNullable: false,
      },
      {
        name: 'diff_preview',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'status',
        type: 'varchar',
        length: '50',
        isNullable: false,
        default: "'pending_review'",
      },
      {
        name: 'reviewed_by',
        type: 'uuid',
        isNullable: true,
      },
      {
        name: 'reviewed_at',
        type: 'timestamp with time zone',
        isNullable: true,
      },
      {
        name: 'review_notes',
        type: 'text',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly knowledgePatchSpaceForeignKey = new TableForeignKey({
    name: 'FK_knowledge_patch_space',
    columnNames: ['space_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'spaces',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly knowledgePatchTopicForeignKey = new TableForeignKey({
    name: 'FK_knowledge_patch_topic',
    columnNames: ['topic_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'topics',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateKnowledgePatchesTable');

    try {
      this.logger.debug('Creating knowledge_patches table');
      await queryRunner.createTable(this.knowledgePatchesTable);
      this.logger.info('Successfully created knowledge_patches table');

      this.logger.debug('Adding foreign key to knowledge_patches.space_id');
      await queryRunner.createForeignKey(
        'knowledge_patches',
        this.knowledgePatchSpaceForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key to knowledge_patches.space_id',
      );

      this.logger.debug('Adding foreign key to knowledge_patches.topic_id');
      await queryRunner.createForeignKey(
        'knowledge_patches',
        this.knowledgePatchTopicForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key to knowledge_patches.topic_id',
      );

      this.logger.debug('Creating index on knowledge_patches.topic_id');
      await queryRunner.query(
        'CREATE INDEX "idx_knowledge_patch_topic" ON "knowledge_patches" ("topic_id")',
      );
      this.logger.info(
        'Successfully created index on knowledge_patches.topic_id',
      );

      this.logger.debug('Creating index on knowledge_patches.space_id');
      await queryRunner.query(
        'CREATE INDEX "idx_knowledge_patch_space" ON "knowledge_patches" ("space_id")',
      );
      this.logger.info(
        'Successfully created index on knowledge_patches.space_id',
      );

      this.logger.debug('Creating index on knowledge_patches.status');
      await queryRunner.query(
        'CREATE INDEX "idx_knowledge_patch_status" ON "knowledge_patches" ("status")',
      );
      this.logger.info(
        'Successfully created index on knowledge_patches.status',
      );

      this.logger.info(
        'Migration CreateKnowledgePatchesTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateKnowledgePatchesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateKnowledgePatchesTable');

    try {
      this.logger.debug('Dropping index idx_knowledge_patch_status');
      await queryRunner.query('DROP INDEX "idx_knowledge_patch_status"');
      this.logger.info('Successfully dropped index idx_knowledge_patch_status');

      this.logger.debug('Dropping index idx_knowledge_patch_space');
      await queryRunner.query('DROP INDEX "idx_knowledge_patch_space"');
      this.logger.info('Successfully dropped index idx_knowledge_patch_space');

      this.logger.debug('Dropping index idx_knowledge_patch_topic');
      await queryRunner.query('DROP INDEX "idx_knowledge_patch_topic"');
      this.logger.info('Successfully dropped index idx_knowledge_patch_topic');

      this.logger.debug('Dropping foreign key from knowledge_patches.topic_id');
      await queryRunner.dropForeignKey(
        'knowledge_patches',
        this.knowledgePatchTopicForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key from knowledge_patches.topic_id',
      );

      this.logger.debug('Dropping foreign key from knowledge_patches.space_id');
      await queryRunner.dropForeignKey(
        'knowledge_patches',
        this.knowledgePatchSpaceForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key from knowledge_patches.space_id',
      );

      this.logger.debug('Dropping knowledge_patches table');
      await queryRunner.dropTable(this.knowledgePatchesTable);
      this.logger.info('Successfully dropped knowledge_patches table');

      this.logger.info(
        'Rollback CreateKnowledgePatchesTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateKnowledgePatchesTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
