import os from 'os';

/**
 * Diagnostic timing for the CLI E2E suite.
 *
 * Exists to answer one question the CI logs cannot: during the stretches when
 * this suite stalls, is the runner saturated or is a worker blocked waiting?
 *
 * The failing runs all fail the same way — `beforeEach` hooks exceeding the
 * 30s `testTimeout`, never an assertion — and the API container logs show it
 * receiving nothing but its 30s healthcheck for over a minute at a time. So
 * the time is going somewhere on this side of the socket, and the API logs
 * are blind to it by definition. `load` in the samples below is what
 * separates the two explanations: high means contention, low means blocked.
 *
 * Off unless `CLI_E2E_TIMING=1`, so a normal run is not perturbed by its own
 * measurement.
 */
const ENABLED = process.env['CLI_E2E_TIMING'] === '1';

// Jest numbers its workers from 1; 0 means the in-band runner.
const WORKER = process.env['JEST_WORKER_ID'] ?? '0';

export function isTimingEnabled(): boolean {
  return ENABLED;
}

/**
 * Written straight to stderr rather than through `console`, which Jest
 * buffers and re-attributes to whichever test it thinks is running — the
 * attribution is wrong precisely when a hook is hanging, which is the case
 * this is here to record. One NDJSON object per line behind a fixed marker,
 * so a whole run's samples can be pulled out of a CI log with grep.
 */
export function emitTiming(
  type: string,
  fields: Record<string, unknown>,
): void {
  if (!ENABLED) return;

  process.stderr.write(
    `@@TIMING@@ ${JSON.stringify({
      t: new Date().toISOString(),
      w: WORKER,
      type,
      ...fields,
    })}\n`,
  );
}

export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Machine-wide load plus this worker's own CPU share.
 *
 * Both are needed. Load alone cannot tell a busy runner from a busy neighbour,
 * and a worker's own CPU alone cannot tell "waiting on the machine" from
 * "waiting on a socket". Together: high load and low worker CPU means this
 * worker is queued behind others; low load and low worker CPU means it is
 * blocked on something that is not the CPU at all.
 */
export function createLoadSampler(intervalMs = 2000): () => void {
  if (!ENABLED) return () => undefined;

  let lastCpu = process.cpuUsage();
  let lastAt = performance.now();

  const timer = setInterval(() => {
    const cpu = process.cpuUsage();
    const now = performance.now();
    const elapsedMs = now - lastAt;

    // cpuUsage is microseconds of CPU time; over `elapsedMs` of wall time that
    // ratio is the share of one core this worker consumed.
    const userPct = ((cpu.user - lastCpu.user) / 1000 / elapsedMs) * 100;
    const systemPct = ((cpu.system - lastCpu.system) / 1000 / elapsedMs) * 100;

    lastCpu = cpu;
    lastAt = now;

    emitTiming('sample', {
      cores: os.cpus().length,
      load: os.loadavg().map((value) => round(value, 2)),
      workerCpuUserPct: round(userPct),
      workerCpuSystemPct: round(systemPct),
      freeMemMb: round(os.freemem() / 1024 / 1024),
    });
  }, intervalMs);

  // Never let the sampler be the reason a worker stays alive.
  timer.unref();

  return () => clearInterval(timer);
}
