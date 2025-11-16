import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export class UpdateKnowledgePatchDiffFields1763297330718
  implements MigrationInterface
{
  private readonly logger = new PackmindLogger(
    'UpdateKnowledgePatchDiffFields1763297330718',
    LogLevel.DEBUG,
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: UpdateKnowledgePatchDiffFields');

    try {
      // Add new columns
      this.logger.info('Adding diff_original column');
      await queryRunner.addColumn(
        'knowledge_patches',
        new TableColumn({
          name: 'diff_original',
          type: 'text',
          isNullable: true, // Temporarily nullable for migration
        }),
      );

      this.logger.info('Adding diff_modified column');
      await queryRunner.addColumn(
        'knowledge_patches',
        new TableColumn({
          name: 'diff_modified',
          type: 'text',
          isNullable: true, // Temporarily nullable for migration
        }),
      );

      // Migrate existing data: copy diffPreview to diffModified, set diffOriginal to empty
      this.logger.info('Migrating existing data from diff_preview');
      await queryRunner.query(`
        UPDATE knowledge_patches
        SET diff_original = '',
            diff_modified = diff_preview
        WHERE diff_preview IS NOT NULL
      `);

      // Make new columns non-nullable
      this.logger.info('Making diff_original non-nullable');
      await queryRunner.changeColumn(
        'knowledge_patches',
        'diff_original',
        new TableColumn({
          name: 'diff_original',
          type: 'text',
          isNullable: false,
        }),
      );

      this.logger.info('Making diff_modified non-nullable');
      await queryRunner.changeColumn(
        'knowledge_patches',
        'diff_modified',
        new TableColumn({
          name: 'diff_modified',
          type: 'text',
          isNullable: false,
        }),
      );

      // Drop old column
      this.logger.info('Dropping diff_preview column');
      await queryRunner.dropColumn('knowledge_patches', 'diff_preview');

      this.logger.info(
        'Migration UpdateKnowledgePatchDiffFields completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdateKnowledgePatchDiffFields failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: UpdateKnowledgePatchDiffFields');

    try {
      // Add back old column
      this.logger.info('Adding back diff_preview column');
      await queryRunner.addColumn(
        'knowledge_patches',
        new TableColumn({
          name: 'diff_preview',
          type: 'text',
          isNullable: true,
        }),
      );

      // Migrate data back: copy diffModified to diffPreview
      this.logger.info('Migrating data back to diff_preview');
      await queryRunner.query(`
        UPDATE knowledge_patches
        SET diff_preview = diff_modified
        WHERE diff_modified IS NOT NULL
      `);

      // Make old column non-nullable
      this.logger.info('Making diff_preview non-nullable');
      await queryRunner.changeColumn(
        'knowledge_patches',
        'diff_preview',
        new TableColumn({
          name: 'diff_preview',
          type: 'text',
          isNullable: false,
        }),
      );

      // Drop new columns
      this.logger.info('Dropping diff_original column');
      await queryRunner.dropColumn('knowledge_patches', 'diff_original');

      this.logger.info('Dropping diff_modified column');
      await queryRunner.dropColumn('knowledge_patches', 'diff_modified');

      this.logger.info(
        'Rollback UpdateKnowledgePatchDiffFields completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback UpdateKnowledgePatchDiffFields failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
