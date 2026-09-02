import {
  DATABASE_POOL_OPTIONS,
  DEFAULT_DATABASE_POOL_CONNECTION_TIMEOUT_MS,
  DEFAULT_DATABASE_POOL_MAX,
  DEFAULT_DATABASE_POOL_MIN,
  resolveDatabasePoolOptions,
} from './database-pool.config';

/**
 * A guard on the invariants, not a restatement of the values: each of these
 * can be broken by a plausible edit that nothing else would catch, because a
 * misconfigured pool is slow rather than broken.
 */
describe('DATABASE_POOL_OPTIONS', () => {
  it('keeps the reaper floor within the pool ceiling', () => {
    // A `min` above `max` makes the warm-up try to hold more connections than
    // the pool will ever open, and it blocks forever on the last one.
    expect(DATABASE_POOL_OPTIONS.min).toBeLessThanOrEqual(
      DATABASE_POOL_OPTIONS.max,
    );
  });

  it('holds connections open between requests', () => {
    // At 0 — pg-pool's default — the reaper drains the pool to empty after 10 s
    // idle and every quiet period is followed by connection handshakes.
    expect(DATABASE_POOL_OPTIONS.min).toBeGreaterThan(0);
  });

  it('gives up on a connection that cannot be established', () => {
    // pg-pool's default is no timeout at all, which turns a database blip into
    // callers that hang instead of failing.
    expect(DATABASE_POOL_OPTIONS.connectionTimeoutMillis).toBeGreaterThan(0);
  });

  it('probes idle connections', () => {
    expect(DATABASE_POOL_OPTIONS.keepAlive).toBe(true);
  });

  it('does not leave the probe delay at the OS default', () => {
    // 0 means "use the OS default", which on Linux is 2 hours — longer than
    // any idle timeout between the pod and Postgres, so the held connections
    // would die unnoticed and be handed out dead.
    expect(DATABASE_POOL_OPTIONS.keepAliveInitialDelayMillis).toBeGreaterThan(
      0,
    );
  });

  it('probes idle connections well before a load balancer drops them', () => {
    expect(DATABASE_POOL_OPTIONS.keepAliveInitialDelayMillis).toBeLessThan(
      60_000,
    );
  });
});

/**
 * The pool sizes are a deployment-shaped choice — `max` per pod times the pod
 * count has to fit under Postgres' `max_connections` — so they are
 * overridable. What these pin is that a bad override degrades to the defaults
 * rather than to a broken pool: `min: NaN` disables the reaper's floor check
 * entirely, and `min > max` leaves the warm-up waiting for a connection the
 * pool will never open.
 */
describe('resolveDatabasePoolOptions', () => {
  describe('when the environment sets nothing', () => {
    it('keeps the default minimum', () => {
      expect(resolveDatabasePoolOptions({}).min).toBe(
        DEFAULT_DATABASE_POOL_MIN,
      );
    });

    it('keeps the default maximum', () => {
      expect(resolveDatabasePoolOptions({}).max).toBe(
        DEFAULT_DATABASE_POOL_MAX,
      );
    });

    it('keeps the default connection timeout', () => {
      expect(resolveDatabasePoolOptions({}).connectionTimeoutMillis).toBe(
        DEFAULT_DATABASE_POOL_CONNECTION_TIMEOUT_MS,
      );
    });
  });

  describe('when the environment overrides the sizes', () => {
    const env = {
      DATABASE_POOL_MIN: '2',
      DATABASE_POOL_MAX: '5',
      DATABASE_POOL_CONNECTION_TIMEOUT_MS: '1000',
    };

    it('takes the minimum from the environment', () => {
      expect(resolveDatabasePoolOptions(env).min).toBe(2);
    });

    it('takes the maximum from the environment', () => {
      expect(resolveDatabasePoolOptions(env).max).toBe(5);
    });

    it('takes the connection timeout from the environment', () => {
      expect(resolveDatabasePoolOptions(env).connectionTimeoutMillis).toBe(
        1000,
      );
    });
  });

  describe.each([
    ['not a number', 'eight'],
    ['not an integer', '4.5'],
    ['zero', '0'],
    ['negative', '-1'],
    ['blank', '  '],
  ])('when an override is %s', (_label, value) => {
    it('falls back to the default', () => {
      expect(resolveDatabasePoolOptions({ DATABASE_POOL_MIN: value }).min).toBe(
        DEFAULT_DATABASE_POOL_MIN,
      );
    });
  });

  describe('when the minimum is set above the maximum', () => {
    const env = { DATABASE_POOL_MIN: '30', DATABASE_POOL_MAX: '5' };

    it('caps the minimum at the maximum', () => {
      expect(resolveDatabasePoolOptions(env).min).toBe(5);
    });

    it('leaves the maximum alone', () => {
      expect(resolveDatabasePoolOptions(env).max).toBe(5);
    });
  });
});
