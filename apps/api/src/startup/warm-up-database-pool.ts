import { DataSource, QueryRunner } from 'typeorm';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { DATABASE_POOL_OPTIONS } from '../app/database-pool.config';

const origin = 'WarmUpDatabasePool';
const logger = new PackmindLogger(origin, LogLevel.INFO);

/**
 * Open the pool's minimum connections before the server accepts traffic.
 *
 * pg-pool reads `min` in exactly one place — the check that decides whether an
 * idle client may be reaped — and never opens a connection to satisfy it. So
 * `min` alone does not survive a deploy: the pool starts empty, and the first
 * requests in each pay a TCP + TLS + startup + auth handshake on behalf of
 * everyone who arrives after them.
 *
 * The connections are acquired together and only released once they are all
 * up. Acquiring them one at a time would warm nothing: each release returns a
 * client to the idle list, and the next acquisition would be handed that same
 * client back rather than opening a second one.
 */
export async function warmUpDatabasePool(
  dataSource: DataSource,
): Promise<void> {
  const connectionCount = DATABASE_POOL_OPTIONS.min;
  const startedAt = Date.now();

  const queryRunners: QueryRunner[] = Array.from(
    { length: connectionCount },
    () => dataSource.createQueryRunner(),
  );

  try {
    await Promise.all(queryRunners.map((queryRunner) => queryRunner.connect()));

    logger.info('Database connection pool warmed up', {
      connections: connectionCount,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    // A cold pool is slow, not broken: the early requests pay the handshake
    // they would have paid anyway. That is never worth failing a boot over.
    logger.warn('Failed to warm up database connection pool', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // Runners that never connected release as a no-op, so this is safe to run
    // across the whole batch after a partial failure. Skipping it would leak
    // the connections that did come up: they would sit checked out forever,
    // permanently costing the pool that much of its `max`.
    await Promise.all(
      queryRunners.map((queryRunner) =>
        queryRunner.release().catch((error: unknown) => {
          logger.warn('Failed to release a warm-up connection', {
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      ),
    );
  }
}
