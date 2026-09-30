import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'StripCredentialsFromStoredGitRemotes1823000000000';

// A web remote carries its credentials whole (`https://oauth2:<token>@host`);
// an SSH one keeps its user and loses its password. Soft-deleted rows are
// scrubbed too: a secret does not stop being one when its row is hidden.
const COLUMNS = [
  { table: 'git_providers', column: 'url' },
  { table: 'plugin_installations', column: 'repo_remote_url' },
];
const WEB_USERINFO = String.raw`^(https?://)[^@/]*@`;
const PASSWORD = String.raw`^([a-z][a-z0-9+.-]*://[^:@/]*):[^@/]*@`;

/**
 * Removes the credentials older servers stored with a remote, which the
 * connections page then displayed: CLIs sent the remote as git reports it,
 * token included, and the CLI-managed provider kept its host part verbatim.
 * Irreversible by design: `down()` cannot, and must not, restore a secret.
 */
export class StripCredentialsFromStoredGitRemotes1823000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: StripCredentialsFromStoredGitRemotes',
    );
    try {
      for (const { table, column } of COLUMNS) {
        const [, webCount] = await queryRunner.query(
          `UPDATE "${table}" SET "${column}" = regexp_replace("${column}", $1, '\\1', 'i')
           WHERE "${column}" ~* $1`,
          [WEB_USERINFO],
        );
        const [, passwordCount] = await queryRunner.query(
          `UPDATE "${table}" SET "${column}" = regexp_replace("${column}", $1, '\\1@', 'i')
           WHERE "${column}" ~* $1`,
          [PASSWORD],
        );
        this.logger.info('Stripped credentials from stored remotes', {
          table,
          column,
          webRemotes: webCount,
          sshRemotes: passwordCount,
        });
      }
      this.logger.info(
        'Migration StripCredentialsFromStoredGitRemotes completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration StripCredentialsFromStoredGitRemotes failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(): Promise<void> {
    this.logger.info(
      'Rollback StripCredentialsFromStoredGitRemotes: nothing to restore, stripped credentials are not kept',
    );
  }
}
