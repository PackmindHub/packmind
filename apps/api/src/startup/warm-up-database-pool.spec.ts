import { DataSource, QueryRunner } from 'typeorm';
import { warmUpDatabasePool } from './warm-up-database-pool';
import { DATABASE_POOL_OPTIONS } from '../app/database-pool.config';

/**
 * The warm-up exists to leave `min` connections open, and every way it can
 * fail to do that is silent: the pool simply goes back to being cold and the
 * API is slow again after each deploy. So the tests pin the three behaviours
 * that carry it — connections held at once, boot never blocked, nothing leaked.
 */

/**
 * Shared bookkeeping across a batch of fake runners.
 *
 * `peakHeld` is the point of it. A pooled client only counts as a *distinct*
 * connection if it is held while the others are being acquired — acquire and
 * release one at a time and pg-pool hands the same client back every time, so
 * the peak stays at 1 and the pool ends up with one warm connection instead of
 * `min`. Counting connects in flight would not catch that; counting how many
 * are checked out at once does.
 */
type PoolState = {
  heldNow: number;
  peakHeld: number;
};

class FakeQueryRunner {
  connected = false;
  released = false;

  constructor(private readonly state: PoolState) {}

  connect = jest.fn(async (): Promise<void> => {
    // Yield, so a sequential implementation is free to release this runner
    // before the rest of the batch is acquired.
    await Promise.resolve();
    this.connected = true;
    this.state.heldNow += 1;
    this.state.peakHeld = Math.max(this.state.peakHeld, this.state.heldNow);
  });

  release = jest.fn(async (): Promise<void> => {
    if (this.connected && !this.released) {
      this.state.heldNow -= 1;
    }
    this.released = true;
  });
}

type Harness = {
  dataSource: DataSource;
  runners: FakeQueryRunner[];
  state: PoolState;
};

function makeHarness(
  onCreate?: (runner: FakeQueryRunner, index: number) => void,
): Harness {
  const state: PoolState = { heldNow: 0, peakHeld: 0 };
  const runners: FakeQueryRunner[] = [];

  const dataSource = {
    createQueryRunner: jest.fn((): QueryRunner => {
      const runner = new FakeQueryRunner(state);
      onCreate?.(runner, runners.length);
      runners.push(runner);
      return runner as unknown as QueryRunner;
    }),
  } as unknown as DataSource;

  return { dataSource, runners, state };
}

describe('warmUpDatabasePool', () => {
  it('asks the pool for as many connections as it refuses to reap', async () => {
    const { dataSource, runners } = makeHarness();

    await warmUpDatabasePool(dataSource);

    expect(runners).toHaveLength(DATABASE_POOL_OPTIONS.min);
  });

  it('opens every connection it asked for', async () => {
    const { dataSource, runners } = makeHarness();

    await warmUpDatabasePool(dataSource);

    expect(runners.every((runner) => runner.connected)).toBe(true);
  });

  it('holds every connection at once, so the pool has to open each one', async () => {
    const { dataSource, state } = makeHarness();

    await warmUpDatabasePool(dataSource);

    expect(state.peakHeld).toBe(DATABASE_POOL_OPTIONS.min);
  });

  it('releases every connection it opened', async () => {
    const { dataSource, runners } = makeHarness();

    await warmUpDatabasePool(dataSource);

    expect(runners.every((runner) => runner.released)).toBe(true);
  });

  it('leaves nothing checked out of the pool', async () => {
    const { dataSource, state } = makeHarness();

    await warmUpDatabasePool(dataSource);

    expect(state.heldNow).toBe(0);
  });

  describe('when a connection cannot be opened', () => {
    const failure = new Error('connection refused');
    const failingRunner = (runner: FakeQueryRunner, index: number) => {
      if (index === 3) {
        runner.connect = jest.fn().mockRejectedValue(failure);
      }
    };

    it('does not fail the boot', async () => {
      const { dataSource } = makeHarness(failingRunner);

      await expect(warmUpDatabasePool(dataSource)).resolves.toBeUndefined();
    });

    it('releases the connections that did open', async () => {
      const { dataSource, runners } = makeHarness(failingRunner);

      await warmUpDatabasePool(dataSource);

      expect(runners.every((runner) => runner.released)).toBe(true);
    });

    it('leaves nothing checked out of the pool', async () => {
      const { dataSource, state } = makeHarness(failingRunner);

      await warmUpDatabasePool(dataSource);

      // Anything still checked out here is gone for the life of the process,
      // costing the pool that much of its `max`.
      expect(state.heldNow).toBe(0);
    });
  });

  it('does not fail the boot when a connection cannot be released', async () => {
    const { dataSource } = makeHarness((runner, index) => {
      if (index === 0) {
        runner.release = jest.fn().mockRejectedValue(new Error('broken pipe'));
      }
    });

    await expect(warmUpDatabasePool(dataSource)).resolves.toBeUndefined();
  });
});
