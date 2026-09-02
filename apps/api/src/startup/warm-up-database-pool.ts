import { DataSource, QueryRunner } from 'typeorm';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { DATABASE_POOL_OPTIONS } from '../app/database-pool.config';

const origin = 'WarmUpDatabasePool';
const logger = new PackmindLogger(origin, LogLevel.INFO);

/**
 * How long bootstrap is willing to spend on the warm-up before serving traffic
 * without it.
 *
 * The pool's own `connectionTimeoutMillis` already bounds each acquisition, so
 * this is the backstop for a stall that escapes it — and the margin on top is
 * what lets pg report the real reason first, rather than having it hidden
 * behind a generic timeout of ours.
 *
 * A deadline is required, not defensive: `warmUpDatabasePool` is awaited
 * before `app.listen`, so anything that can leave it pending can leave the
 * process running and answering nothing.
 */
export const DATABASE_WARM_UP_TIMEOUT_MS =
  DATABASE_POOL_OPTIONS.connectionTimeoutMillis + 5_000;

type ConnectionAttempt = { opened: true } | { opened: false; error: unknown };

type Deadline = {
  elapsed: Promise<void>;
  cancel: () => void;
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function startDeadline(timeoutMs: number): Deadline {
  let timer: NodeJS.Timeout | undefined;

  const elapsed = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
    // The warm-up is not a reason to keep a process alive on its own.
    timer.unref?.();
  });

  return {
    elapsed,
    cancel: () => {
      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}

/**
 * Turn a rejection into an outcome.
 *
 * `Promise.all` over raw acquisitions rejects on the first refusal, and the
 * cleanup then runs while the siblings are still in flight — releasing runners
 * that have not yet been handed a client. TypeORM installs the release
 * callback when the acquisition lands, so those late clients would stay
 * checked out for the life of the process, permanently costing the pool that
 * much of its `max`.
 */
function settle(connection: Promise<void>): Promise<ConnectionAttempt> {
  return connection.then(
    (): ConnectionAttempt => ({ opened: true }),
    (error: unknown): ConnectionAttempt => ({ opened: false, error }),
  );
}

async function releaseQuietly(queryRunner: QueryRunner): Promise<void> {
  try {
    await queryRunner.release();
  } catch (error) {
    logger.warn('Failed to release a warm-up connection', {
      error: describeError(error),
    });
  }
}

/**
 * Open the pool's minimum connections before the server accepts traffic.
 *
 * pg-pool reads `min` in exactly one place — the check that decides whether an
 * idle client may be reaped — and never opens a connection to satisfy it. So
 * `min` alone does not survive a deploy: the pool starts empty, and the first
 * requests in each pay a TCP + TLS + startup + auth handshake on behalf of
 * everyone who arrives after them.
 *
 * The connections are acquired together and only released once the batch has
 * settled. Acquiring them one at a time would warm nothing: each release
 * returns a client to the idle list, and the next acquisition would be handed
 * that same client back rather than opening a second one.
 */
export async function warmUpDatabasePool(
  dataSource: DataSource,
): Promise<void> {
  const connectionCount = DATABASE_POOL_OPTIONS.min;
  const startedAt = Date.now();
  const deadline = startDeadline(DATABASE_WARM_UP_TIMEOUT_MS);

  const queryRunners: QueryRunner[] = Array.from(
    { length: connectionCount },
    () => dataSource.createQueryRunner(),
  );

  try {
    const attempts = queryRunners.map((queryRunner) =>
      settle(queryRunner.connect()),
    );

    // Resolves to whether the batch settled on its own. Waiting on it rather
    // than on the acquisitions is what keeps a single stalled connection from
    // holding the listener closed.
    const batchSettled = Promise.race([
      Promise.all(attempts).then(() => true),
      deadline.elapsed.then(() => false),
    ]);

    // A runner is released once its own acquisition has landed *and* the batch
    // has been held together — releasing earlier would hand the freed client
    // straight back to a sibling still acquiring, and the pool would end up
    // warm by one. A straggler that lands past the deadline releases itself
    // here too, in the background, instead of staying checked out.
    const lifecycles = queryRunners.map(async (queryRunner, index) => {
      await attempts[index];
      await batchSettled;
      await releaseQuietly(queryRunner);
    });

    if (!(await batchSettled)) {
      logger.warn('Timed out warming up the database connection pool', {
        connections: connectionCount,
        timeoutMs: DATABASE_WARM_UP_TIMEOUT_MS,
      });
      return;
    }

    // Bounded by the same deadline: a release can hang just as an acquisition
    // can, and boot must not wait on it either.
    await Promise.race([Promise.all(lifecycles), deadline.elapsed]);

    const outcomes = await Promise.all(attempts);
    const failures = outcomes.filter(
      (outcome): outcome is { opened: false; error: unknown } =>
        !outcome.opened,
    );

    if (failures.length > 0) {
      // A cold pool is slow, not broken: the early requests pay the handshake
      // they would have paid anyway. That is never worth failing a boot over.
      logger.warn('Failed to warm up the whole database connection pool', {
        opened: outcomes.length - failures.length,
        failed: failures.length,
        error: describeError(failures[0].error),
      });
      return;
    }

    logger.info('Database connection pool warmed up', {
      connections: connectionCount,
      durationMs: Date.now() - startedAt,
    });
  } finally {
    deadline.cancel();
  }
}
