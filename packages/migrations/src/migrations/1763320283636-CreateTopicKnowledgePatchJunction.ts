import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'CreateTopicKnowledgePatchJunction1763320283636';

export class CreateTopicKnowledgePatchJunction1763320283636
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly junctionTable = new Table({
    name: 'topic_knowledge_patches',
    columns: [
      {
        name: 'topic_id',
        type: 'uuid',
        isPrimary: true,
        isNullable: false,
      },
      {
        name: 'knowledge_patch_id',
        type: 'uuid',
        isPrimary: true,
        isNullable: false,
      },
      {
        name: 'created_at',
        type: 'timestamp with time zone',
        isNullable: false,
        default: 'CURRENT_TIMESTAMP',
      },
    ],
  });

  private readonly topicForeignKey = new TableForeignKey({
    columnNames: ['topic_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'topics',
    onDelete: 'CASCADE',
  });

  private readonly patchForeignKey = new TableForeignKey({
    columnNames: ['knowledge_patch_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'knowledge_patches',
    onDelete: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateTopicKnowledgePatchJunction');

    try {
      // Create junction table
      this.logger.info('Creating topic_knowledge_patches table');
      await queryRunner.createTable(this.junctionTable);

      // Add foreign keys
      this.logger.info('Adding foreign key to topics');
      await queryRunner.createForeignKey(
        'topic_knowledge_patches',
        this.topicForeignKey,
      );

      this.logger.info('Adding foreign key to knowledge_patches');
      await queryRunner.createForeignKey(
        'topic_knowledge_patches',
        this.patchForeignKey,
      );

      // Create indexes
      this.logger.info('Creating indexes');
      await queryRunner.query(`
        CREATE INDEX idx_topic_knowledge_patch_topic
        ON topic_knowledge_patches (topic_id);
      `);

      await queryRunner.query(`
        CREATE INDEX idx_topic_knowledge_patch_patch
        ON topic_knowledge_patches (knowledge_patch_id);
      `);

      // Migrate existing data from knowledge_patches.topic_id to junction table
      this.logger.info('Migrating existing topic_id data to junction table');
      await queryRunner.query(`
        INSERT INTO topic_knowledge_patches (topic_id, knowledge_patch_id, created_at)
        SELECT topic_id, id, created_at
        FROM knowledge_patches
        WHERE topic_id IS NOT NULL AND deleted_at IS NULL;
      `);

      // Drop the old topic_id column and its index
      this.logger.info('Dropping idx_knowledge_patch_topic index');
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_knowledge_patch_topic;
      `);

      this.logger.info('Dropping topic_id column from knowledge_patches');
      await queryRunner.query(`
        ALTER TABLE knowledge_patches
        DROP COLUMN topic_id;
      `);

      this.logger.info(
        'Migration CreateTopicKnowledgePatchJunction completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateTopicKnowledgePatchJunction failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateTopicKnowledgePatchJunction');

    try {
      // Re-add topic_id column to knowledge_patches
      this.logger.info('Re-adding topic_id column to knowledge_patches');
      await queryRunner.query(`
        ALTER TABLE knowledge_patches
        ADD COLUMN topic_id uuid NULL;
      `);

      // Migrate data back (only take the first topic if multiple exist)
      this.logger.info('Migrating data back to topic_id column');
      await queryRunner.query(`
        UPDATE knowledge_patches kp
        SET topic_id = (
          SELECT topic_id
          FROM topic_knowledge_patches tkp
          WHERE tkp.knowledge_patch_id = kp.id
          ORDER BY tkp.created_at ASC
          LIMIT 1
        )
        WHERE EXISTS (
          SELECT 1
          FROM topic_knowledge_patches tkp
          WHERE tkp.knowledge_patch_id = kp.id
        );
      `);

      // Make topic_id NOT NULL after migration
      await queryRunner.query(`
        ALTER TABLE knowledge_patches
        ALTER COLUMN topic_id SET NOT NULL;
      `);

      // Re-create index
      this.logger.info('Re-creating idx_knowledge_patch_topic index');
      await queryRunner.query(`
        CREATE INDEX idx_knowledge_patch_topic
        ON knowledge_patches (topic_id);
      `);

      // Drop junction table indexes
      this.logger.info('Dropping junction table indexes');
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_topic_knowledge_patch_topic;
      `);
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_topic_knowledge_patch_patch;
      `);

      // Drop foreign keys
      this.logger.info('Dropping foreign keys');
      await queryRunner.dropForeignKey(
        'topic_knowledge_patches',
        this.patchForeignKey,
      );
      await queryRunner.dropForeignKey(
        'topic_knowledge_patches',
        this.topicForeignKey,
      );

      // Drop junction table
      this.logger.info('Dropping topic_knowledge_patches table');
      await queryRunner.dropTable(this.junctionTable);

      this.logger.info(
        'Rollback CreateTopicKnowledgePatchJunction completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateTopicKnowledgePatchJunction failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
