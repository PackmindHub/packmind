/**
 * Postgres connection-pool settings for the API.
 *
 * Without an `extra` block, `TypeOrmModule.forRoot` hands pg-pool nothing and
 * pg-pool applies its own defaults: `min: 0` and a 10 s idle timeout. The
 * reaper therefore drains the pool to empty between requests, and the next
 * request pays a full TCP + TLS + startup + auth handshake before its query
 * runs. Measured on a single-row primary-key lookup, that is the difference
 * between ~6 ms on a pooled connection and ~800 ms on a fresh one.
 *
 * These live in their own module rather than inline in `app.module.ts` because
 * the bootstrap warm-up has to open exactly `min` connections. A second `8`
 * written next to the warm-up loop would drift from this one without anything
 * failing — the pool would just quietly go back to being cold.
 */
export const DATABASE_APPLICATION_NAME = 'packmind-api';

export const DATABASE_POOL_OPTIONS = {
  /**
   * Floor the reaper is not allowed to drain past: pg-pool only collects an
   * idle client while `_clients.length > min`.
   *
   * pg-pool never *opens* a connection to reach this floor, so `min` on its
   * own does not warm anything — it only stops connections that already exist
   * from being thrown away. Opening them is `warmUpDatabasePool`'s job.
   */
  min: 8,
  max: 20,
  keepAlive: true,
  /**
   * `keepAlive: true` on its own is close to decorative here. pg forwards
   * `keepAliveInitialDelayMillis ?? 0` to `socket.setKeepAlive`, and 0 means
   * "leave the OS default", which on Linux is `tcp_keepalive_time` — 2 hours.
   * The load balancers and NAT gateways between the pod and Postgres drop an
   * idle socket long before that.
   *
   * That only became our problem once `min` started holding 8 connections open
   * through the night: without probes on a timescale shorter than those idle
   * timeouts, the pool would hand out sockets that died hours ago. This is
   * what makes holding idle connections safe rather than merely faster.
   */
  keepAliveInitialDelayMillis: 10_000,
} as const;
