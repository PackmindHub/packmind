import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { v4 as uuidv4 } from 'uuid';

const origin = 'AddDefaultTargetsForExistingGitRepos1757667343776';

export class AddDefaultTargetsForExistingGitRepos1757667343776 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddDefaultTargetsForExistingGitRepos',
    );

    try {
      // Find all git repositories that don't already have a default target
      this.logger.debug('Finding git repositories without default targets');
      const gitReposWithoutDefaultTargets = await queryRunner.query(`
        SELECT gr.id, gr.created_at, gr.updated_at
        FROM git_repos gr
        LEFT JOIN targets t ON t.git_repo_id = gr.id AND t.name = 'Default' AND t.path = '.'
        WHERE t.id IS NULL
          AND gr.deleted_at IS NULL
      `);

      this.logger.info(
        `Found ${gitReposWithoutDefaultTargets.length} git repositories without default targets`,
      );

      if (gitReposWithoutDefaultTargets.length === 0) {
        this.logger.info('No git repositories need default targets');
        return;
      }

      // Insert default target for each git repository
      this.logger.debug('Creating default targets for git repositories');
      for (const gitRepo of gitReposWithoutDefaultTargets) {
        const targetId = uuidv4();
        const now = new Date();

        await queryRunner.query(
          `
          INSERT INTO targets (id, name, path, git_repo_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [targetId, 'Default', '.', gitRepo.id, now, now],
        );

        this.logger.debug(`Created default target for git repo: ${gitRepo.id}`);
      }

      this.logger.info(
        `Successfully created ${gitReposWithoutDefaultTargets.length} default targets`,
      );
      this.logger.info(
        'Migration AddDefaultTargetsForExistingGitRepos completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddDefaultTargetsForExistingGitRepos failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddDefaultTargetsForExistingGitRepos');

    try {
      // Remove all default targets that were created by this migration
      this.logger.debug('Removing default targets created by this migration');
      const result = await queryRunner.query(`
        DELETE FROM targets 
        WHERE name = 'Default' AND path = '.'
      `);

      this.logger.info(`Removed ${result.affectedRows || 0} default targets`);
      this.logger.info(
        'Rollback AddDefaultTargetsForExistingGitRepos completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddDefaultTargetsForExistingGitRepos failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
