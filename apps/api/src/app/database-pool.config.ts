import { LogLevel, PackmindLogger } from '@packmind/logger';

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
 *
 * The sizes are read from the environment rather than from
 * `Configuration.getConfig`: they are tuning knobs, not secrets, and
 * `TypeOrmModule.forRoot` is a synchronous factory that already reads
 * `DATABASE_URL` off `process.env` the same way.
 */
const logger = new PackmindLogger('DatabasePoolConfig', LogLevel.INFO);

export const DATABASE_APPLICATION_NAME = 'packmind-api';

/**
 * A fixed-size pool: the floor and the ceiling are deliberately the same
 * number, so the pool opens its connections once and then only ever reuses
 * them.
 *
 * The gap between a `min` and a larger `max` is not free headroom here. Any
 * connection opened above `min` is opened cold, mid-request, and a cold
 * connection costs ~800 ms against ~6 ms for a pooled one. Given that ratio,
 * a pool that is allowed to grow will reliably choose the expensive option:
 * pg-pool opens a new client whenever every existing one is busy, even though
 * one is about to free up in single-digit milliseconds.
 *
 * Measured on a real page load: the frontend fires ~10 parallel requests, each
 * running an auth-guard lookup plus its handler's queries — around 50 short
 * queries inside 40 ms. Allowed to grow, the pool answered that by opening 50
 * connections. Held at 20, the same 50 queries are served by reusing warm ones
 * and cost ~10 ms of queueing instead of a handshake. The 800 ms leaves the
 * request path entirely and is paid once, at boot, by `warmUpDatabasePool`.
 *
 * 20 fits the deployment we run today: production averages well under
 * 0.1 req/s, so concurrent users are not what sizes this — one page's fan-out
 * is. Each held connection costs ~1.4 MiB on the Postgres side, so a pod holds
 * ~28 MB. What binds is `max_connections`: this number times the pod count has
 * to stay under it with room for migrations and admin sessions. A deployment
 * that cannot afford it should scale BOTH values down together rather than
 * reopening the gap between them — a `max` above `min` buys latency at the
 * worst possible exchange rate.
 */
export const DEFAULT_DATABASE_POOL_MIN = 20;
export const DEFAULT_DATABASE_POOL_MAX = 20;

/**
 * Ceiling on how long a caller waits for a connection before giving up.
 *
 * pg-pool's own default is no timeout at all: a client that cannot be
 * established leaves the acquisition pending forever, which turns a database
 * blip into requests — and, before this bound existed, a bootstrap — that hang
 * rather than fail. Anything past 30 s is already past every caller's own
 * patience, so failing there loses nothing and frees the slot.
 */
export const DEFAULT_DATABASE_POOL_CONNECTION_TIMEOUT_MS = 30_000;

export type DatabasePoolOptions = {
  min: number;
  max: number;
  connectionTimeoutMillis: number;
  keepAlive: boolean;
  keepAliveInitialDelayMillis: number;
};

type Environment = Record<string, string | undefined>;

/**
 * Read a pool setting from the environment, falling back to the default on
 * anything that is not a positive integer.
 *
 * A typo'd override must not take the pool down with it: `min: NaN` makes
 * pg-pool's reaper comparison always false, so it would reap every idle
 * client and hand us back the cold pool this module exists to prevent.
 */
function readPoolSetting(
  env: Environment,
  variable: string,
  fallback: number,
): number {
  const raw = env[variable];

  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    logger.warn('Ignoring invalid database pool setting', {
      variable,
      value: raw,
      fallback,
    });
    return fallback;
  }

  return parsed;
}

export function resolveDatabasePoolOptions(
  env: Environment = process.env,
): DatabasePoolOptions {
  const min = readPoolSetting(
    env,
    'DATABASE_POOL_MIN',
    DEFAULT_DATABASE_POOL_MIN,
  );
  const max = readPoolSetting(
    env,
    'DATABASE_POOL_MAX',
    DEFAULT_DATABASE_POOL_MAX,
  );

  // pg-pool does not validate this pair. With `min > max` it opens `max`
  // clients and the warm-up then waits forever for a `min`th that the pool
  // will never create, so the mistake has to be corrected here.
  if (min > max) {
    logger.warn('Database pool minimum exceeds its maximum, capping it', {
      min,
      max,
    });
  }

  return {
    /**
     * Floor the reaper is not allowed to drain past: pg-pool only collects an
     * idle client while `_clients.length > min`.
     *
     * pg-pool never *opens* a connection to reach this floor, so `min` on its
     * own does not warm anything — it only stops connections that already
     * exist from being thrown away. Opening them is `warmUpDatabasePool`'s
     * job.
     */
    min: Math.min(min, max),
    max,
    connectionTimeoutMillis: readPoolSetting(
      env,
      'DATABASE_POOL_CONNECTION_TIMEOUT_MS',
      DEFAULT_DATABASE_POOL_CONNECTION_TIMEOUT_MS,
    ),
    keepAlive: true,
    /**
     * `keepAlive: true` on its own is close to decorative here. pg forwards
     * `keepAliveInitialDelayMillis ?? 0` to `socket.setKeepAlive`, and 0 means
     * "leave the OS default", which on Linux is `tcp_keepalive_time` — 2
     * hours. The load balancers and NAT gateways between the pod and Postgres
     * drop an idle socket long before that.
     *
     * That only became our problem once `min` started holding connections open
     * through the night: without probes on a timescale shorter than those idle
     * timeouts, the pool would hand out sockets that died hours ago. This is
     * what makes holding idle connections safe rather than merely faster.
     */
    keepAliveInitialDelayMillis: 10_000,
  };
}

export const DATABASE_POOL_OPTIONS = resolveDatabasePoolOptions();
