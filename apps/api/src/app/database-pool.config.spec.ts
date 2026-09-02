import { DATABASE_POOL_OPTIONS } from './database-pool.config';

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

  it('probes idle connections well before a load balancer drops them', () => {
    expect(DATABASE_POOL_OPTIONS.keepAlive).toBe(true);
    // 0 means "use the OS default", which on Linux is 2 hours — longer than
    // any idle timeout between the pod and Postgres, so the held connections
    // would die unnoticed and be handed out dead.
    expect(DATABASE_POOL_OPTIONS.keepAliveInitialDelayMillis).toBeGreaterThan(
      0,
    );
    expect(DATABASE_POOL_OPTIONS.keepAliveInitialDelayMillis).toBeLessThan(
      60_000,
    );
  });
});
