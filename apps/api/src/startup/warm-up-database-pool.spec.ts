import { DataSource, QueryRunner } from 'typeorm';
import {
  DATABASE_WARM_UP_TIMEOUT_MS,
  warmUpDatabasePool,
} from './warm-up-database-pool';
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
  settled = false;
  releasedWhileAcquiring = false;

  /**
   * What the acquisition is waiting on. Resolved by default — but still a
   * yield, so a sequential implementation is free to release this runner
   * before the rest of the batch is acquired.
   */
  private handshake: Promise<void> = Promise.resolve();
  private land: () => void = () => undefined;
  private failure?: Error;

  constructor(private readonly state: PoolState) {}

  /** Leave this acquisition in flight until `landsNow` is called. */
  stalls(): void {
    this.handshake = new Promise<void>((resolve) => {
      this.land = resolve;
    });
  }

  landsNow(): void {
    this.land();
  }

  failsWith(error: Error): void {
    this.failure = error;
  }

  connect = jest.fn(async (): Promise<void> => {
    try {
      await this.handshake;

      if (this.failure) {
        throw this.failure;
      }

      this.connected = true;
      this.state.heldNow += 1;
      this.state.peakHeld = Math.max(this.state.peakHeld, this.state.heldNow);
    } finally {
      this.settled = true;
    }
  });

  release = jest.fn(async (): Promise<void> => {
    // Releasing before the acquisition settles is a no-op that TypeORM will
    // not replay: the client it is about to be handed never comes back.
    if (!this.settled) {
      this.releasedWhileAcquiring = true;
    }

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
        runner.failsWith(failure);
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

  describe('when a connection is refused while its siblings are in flight', () => {
    const refusedAmongPending = (runner: FakeQueryRunner, index: number) => {
      if (index === 3) {
        runner.failsWith(new Error('connection refused'));
      } else {
        runner.stalls();
      }
    };

    async function warmUpThenLandTheSiblings(harness: Harness): Promise<void> {
      const warmUp = warmUpDatabasePool(harness.dataSource);

      // Drain the microtask queue, so an implementation that gives up on the
      // first rejection has run its whole cleanup before the siblings are
      // handed their clients. That ordering is the bug: those clients arrive
      // after the release that was supposed to return them.
      await new Promise((resolve) => setImmediate(resolve));
      harness.runners.forEach((runner) => runner.landsNow());

      await warmUp;
    }

    it('releases no connection before it has been acquired', async () => {
      const harness = makeHarness(refusedAmongPending);

      await warmUpThenLandTheSiblings(harness);

      expect(
        harness.runners.some((runner) => runner.releasedWhileAcquiring),
      ).toBe(false);
    });

    it('leaves nothing checked out of the pool', async () => {
      const harness = makeHarness(refusedAmongPending);

      await warmUpThenLandTheSiblings(harness);

      // A sibling released mid-acquisition keeps the client it is handed
      // afterwards, for the life of the process.
      expect(harness.state.heldNow).toBe(0);
    });
  });

  describe('when a connection never settles', () => {
    const stalledRunner = (runner: FakeQueryRunner, index: number) => {
      if (index === 3) {
        runner.stalls();
      }
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /**
     * Runs the warm-up past its deadline and reports whether it came back.
     *
     * Racing rather than awaiting is deliberate: an implementation that waits
     * on the stalled acquisition never returns, and awaiting it under fake
     * timers hangs the run instead of failing it.
     */
    async function warmUpPastTheDeadline(
      harness: Harness,
    ): Promise<'returned' | 'still pending'> {
      const warmUp = warmUpDatabasePool(harness.dataSource);

      return Promise.race([
        warmUp.then((): 'returned' => 'returned'),
        jest
          .advanceTimersByTimeAsync(DATABASE_WARM_UP_TIMEOUT_MS * 2)
          .then((): 'still pending' => 'still pending'),
      ]);
    }

    it('gives up rather than hold the listener closed', async () => {
      const harness = makeHarness(stalledRunner);

      // Bootstrap awaits this before `app.listen`, so a pending warm-up is a
      // process that stays up answering nothing.
      await expect(warmUpPastTheDeadline(harness)).resolves.toBe('returned');
    });

    it('releases the connections that did open', async () => {
      const harness = makeHarness(stalledRunner);

      await warmUpPastTheDeadline(harness);

      expect(harness.state.heldNow).toBe(0);
    });

    it('releases a connection that lands after the deadline', async () => {
      const harness = makeHarness(stalledRunner);
      await warmUpPastTheDeadline(harness);

      harness.runners[3].landsNow();
      await jest.advanceTimersByTimeAsync(0);

      expect(harness.runners[3].released).toBe(true);
    });

    it('leaves a late connection checked in, not held', async () => {
      const harness = makeHarness(stalledRunner);
      await warmUpPastTheDeadline(harness);

      harness.runners[3].landsNow();
      await jest.advanceTimersByTimeAsync(0);

      expect(harness.state.heldNow).toBe(0);
    });
  });
});
