#!/usr/bin/env node
/**
 * Measures what one CLI-E2E test's fixture setup costs against a running API.
 *
 * `jest-stage` re-runs the `describeWithUserSignedUp` setup before every `it`,
 * so the four calls below are paid ~287 times per suite run. Jest's JSON cannot
 * separate that from the test bodies (jest-circus starts a test's clock before
 * its `beforeEach`), so this replays the exact same sequence standalone and
 * times each phase.
 *
 * Nothing here touches the test suite or the API: it is the same HTTP calls the
 * helpers make, against whatever `PACKMIND_INSTANCE_URL` points at. The point is
 * to size the prize before changing anything — in particular before touching the
 * bcrypt cost factor, which `signup` and `signin` each pay once.
 *
 * Usage:
 *   PACKMIND_INSTANCE_URL=http://localhost:3000 \
 *     node scripts/measure-cli-e2e-setup-cost.mjs [--iterations 30] [--tests 287]
 */

import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const AUTH_PHASES = ['signup', 'signin', 'generateApiKey', 'getGlobalSpace'];
// `--full` adds what `install.spec.ts` — the file that sets the suite's floor —
// does in its beforeEach chain on top of the auth fixture. Its `it` bodies are
// pure assertions, so these phases are the whole per-test cost of that file.
// `cliVersion` is not part of a real test. It is the same spawn as `cliInstall`
// — node starting up and parsing the CLI bundle — with no API call and no file
// written, so the difference between the two separates the fixed cost of
// launching the CLI from the work the command actually does. That distinction
// decides whether the lever is "fewer spawns per test" or "a faster command".
// `cliVersionCached` is the same spawn again with NODE_COMPILE_CACHE pointed at
// a warmed directory. Node caches the compiled bytecode of the bundle there, so
// the gap against `cliVersion` is how much of the startup is V8 re-parsing code
// it has already seen. Available since Node 22 and needs no code change, which
// is why it is worth a column of its own.
const FULL_PHASES = [
  'tempDirs',
  'gitRepo',
  'createPackage',
  'cliVersion',
  'cliVersionCached',
  'cliInstall',
];

// One cache directory for the whole script run, warmed on first use: in a real
// suite run the first test would warm it and the other 286 would benefit.
let compileCacheDir;
function warmCompileCache(cwd, home) {
  if (compileCacheDir) return compileCacheDir;
  compileCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-v8cache-'));
  runCli('--version', {
    cwd,
    home,
    env: { NODE_COMPILE_CACHE: compileCacheDir },
  });
  return compileCacheDir;
}

function parseArgs(argv) {
  const options = { iterations: 30, tests: 287, warmup: 3, full: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--iterations') options.iterations = Number(argv[++index]);
    else if (flag === '--tests') options.tests = Number(argv[++index]);
    else if (flag === '--warmup') options.warmup = Number(argv[++index]);
    else if (flag === '--full') options.full = true;
    else {
      process.stderr.write(`Unknown argument: ${flag}\n`);
      process.exit(1);
    }
  }
  return options;
}

function baseUrl() {
  return process.env['PACKMIND_INSTANCE_URL'] || 'http://localhost:4200';
}

async function timed(fn) {
  const started = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - started };
}

function expectOk(response, what) {
  if (!response.ok) {
    throw new Error(
      `${what} failed: ${response.status} ${response.statusText}`,
    );
  }
  return response;
}

/**
 * The organization id the space lookup needs is carried inside the API key: a
 * base64 JSON envelope holding a JWT. Mirrors PackmindHttpClient.
 */
function organizationIdFromApiKey(apiKey) {
  const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8'));
  const payload = JSON.parse(
    Buffer.from(decoded.jwt.split('.')[1], 'base64').toString('utf-8'),
  );
  return payload.organization.id;
}

function cliPath() {
  return (
    process.env['CLI_BINARY_PATH'] ??
    path.resolve(process.cwd(), 'dist/apps/cli/main.cjs')
  );
}

/** The five git invocations `setupGitRepo` runs. */
function setupGitRepo(testDir) {
  const run = (args) =>
    execFileSync('git', args, { cwd: testDir, stdio: 'ignore' });
  run(['init', '-b', 'main', '.']);
  run([
    'remote',
    'add',
    'origin',
    'git@github.com:PackmindHub/sample-repo.git',
  ]);
  run(['config', 'user.email', 'test@packmind.com']);
  run(['config', 'user.name', 'Test User']);
  run(['commit', '--allow-empty', '-m', 'Initial commit']);
}

/** Spawns the built CLI the way `runCli` does, and waits for it to exit. */
function runCli(command, { apiKey, cwd, home, env: extraEnv }) {
  const target = cliPath();
  const args = command.split(' ');
  const env = {
    ...process.env,
    HOME: home,
    ...(apiKey ? { PACKMIND_API_KEY: apiKey } : {}),
    ...extraEnv,
  };
  const isJs = target.endsWith('.cjs') || target.endsWith('.js');
  const result = isJs
    ? spawnSync('node', [target, ...args], { cwd, env, encoding: 'utf-8' })
    : spawnSync(target, args, { cwd, env, encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(
      `CLI \`${command}\` exited ${result.status}: ${(result.stderr || result.stdout || '').slice(0, 400)}`,
    );
  }
  return result;
}

/** One full fixture setup, as `describeWithUserSignedUp` performs it. */
async function oneSetup(url, full = false) {
  const email = `bench-${randomUUID()}@example.com`;
  // The API asks for at least 8 characters and at least two non-alphanumerics;
  // a UUID's own hyphens cover both. Deliberately not the password-shaped
  // literal the test factory uses — there is no reason for this script to carry
  // a string a secret scanner will flag, and the policy is documented here
  // instead of copied.
  const password = `bench-${randomUUID()}`;
  const timings = {};

  timings.signup = (
    await timed(() =>
      fetch(`${url}/api/v0/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, method: 'password' }),
      }).then((response) => expectOk(response, 'signup')),
    )
  ).ms;

  const signin = await timed(() =>
    fetch(`${url}/api/v0/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((response) => expectOk(response, 'signin')),
  );
  timings.signin = signin.ms;
  const cookie = signin.value.headers.get('set-cookie');

  const apiKeyCall = await timed(() =>
    fetch(`${url}/api/v0/auth/api-key/generate`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    })
      .then((response) => expectOk(response, 'generateApiKey'))
      .then((response) => response.json()),
  );
  timings.generateApiKey = apiKeyCall.ms;

  const organizationId = organizationIdFromApiKey(apiKeyCall.value.apiKey);
  const globalSpace = await timed(() =>
    fetch(`${url}/api/v0/organizations/${organizationId}/spaces/global`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyCall.value.apiKey}`,
      },
    })
      .then((response) => expectOk(response, 'getGlobalSpace'))
      .then((response) => response.json()),
  );
  timings.getGlobalSpace = globalSpace.ms;
  const spaceId = globalSpace.value.id;

  if (!full) {
    return timings;
  }

  // From here on: install.spec.ts's own beforeEach, on top of the fixture.
  let started = performance.now();
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-home-'));
  timings.tempDirs = performance.now() - started;

  try {
    started = performance.now();
    setupGitRepo(testDir);
    timings.gitRepo = performance.now() - started;

    const apiKey = apiKeyCall.value.apiKey;
    started = performance.now();
    const created = await fetch(
      `${url}/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: 'Bench package',
          description: 'Package used to time one install.spec test',
          recipeIds: [],
          standardIds: [],
          spaceId,
        }),
      },
    )
      .then((response) => expectOk(response, 'createPackage'))
      .then((response) => response.json());
    timings.createPackage = performance.now() - started;

    started = performance.now();
    runCli('--version', { apiKey, cwd: testDir, home: testHome });
    timings.cliVersion = performance.now() - started;

    const cacheDir = warmCompileCache(testDir, testHome);
    started = performance.now();
    runCli('--version', {
      apiKey,
      cwd: testDir,
      home: testHome,
      env: { NODE_COMPILE_CACHE: cacheDir },
    });
    timings.cliVersionCached = performance.now() - started;

    started = performance.now();
    runCli(`install ${created.package.slug}`, {
      apiKey,
      cwd: testDir,
      home: testHome,
    });
    timings.cliInstall = performance.now() - started;
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.rmSync(testHome, { recursive: true, force: true });
  }

  return timings;
}

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return low === high
    ? sorted[low]
    : sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = baseUrl();

  process.stderr.write(
    `Measuring against ${url} — ${options.warmup} warmup + ${options.iterations} timed sequences\n`,
  );

  // Warm up first: the API is an Nx dev server, and its first requests pay
  // lazy module loading and an empty connection pool.
  for (let index = 0; index < options.warmup; index += 1) {
    await oneSetup(url, options.full);
  }

  const phases = options.full ? [...AUTH_PHASES, ...FULL_PHASES] : AUTH_PHASES;
  const samples = Object.fromEntries(phases.map((phase) => [phase, []]));
  const totals = [];
  for (let index = 0; index < options.iterations; index += 1) {
    const timings = await oneSetup(url, options.full);
    let total = 0;
    for (const phase of phases) {
      samples[phase].push(timings[phase]);
      total += timings[phase];
    }
    totals.push(total);
  }

  const perPhase = Object.fromEntries(
    phases.map((phase) => [phase, stats(samples[phase])]),
  );
  const perSetup = stats(totals);

  const lines = [];
  lines.push(
    options.full
      ? '## CLI E2E cost of one full `install.spec.ts` test'
      : '## CLI E2E fixture setup cost',
  );
  lines.push('');
  lines.push(`Measured against \`${url}\`, ${options.iterations} sequences.`);
  lines.push('');
  lines.push('| Phase | Median | p90 | Min | Max |');
  lines.push('| --- | --: | --: | --: | --: |');
  for (const phase of phases) {
    const s = perPhase[phase];
    lines.push(
      `| \`${phase}\` | ${s.median.toFixed(0)}ms | ${s.p90.toFixed(0)}ms | ${s.min.toFixed(0)}ms | ${s.max.toFixed(0)}ms |`,
    );
  }
  lines.push(
    `| **${options.full ? 'one whole test' : 'one full setup'}** | **${perSetup.median.toFixed(0)}ms** | ${perSetup.p90.toFixed(0)}ms | ${perSetup.min.toFixed(0)}ms | ${perSetup.max.toFixed(0)}ms |`,
  );
  lines.push('');

  const over = (ms) => ((ms * options.tests) / 1000).toFixed(0);
  const auth = AUTH_PHASES.reduce(
    (sum, phase) => sum + perPhase[phase].median,
    0,
  );
  const hashing = perPhase.signup.median + perPhase.signin.median;

  lines.push(
    `Over ${options.tests} tests, one per test: **${over(perSetup.median)}s** of serial cost.`,
  );
  lines.push('');
  if (options.full) {
    // The point of this mode: say which phase to attack, not just the total.
    const ranked = [...AUTH_PHASES, ...FULL_PHASES]
      .map((phase) => ({ phase, median: perPhase[phase].median }))
      .sort((a, b) => b.median - a.median);
    lines.push('Where it goes, largest first:');
    lines.push('');
    for (const { phase, median } of ranked) {
      const share = ((median / perSetup.median) * 100).toFixed(0);
      lines.push(
        `- \`${phase}\` — ${median.toFixed(0)}ms, ${share}% of the test, ${over(median)}s over the file`,
      );
    }
    lines.push('');
    lines.push(
      `The auth fixture is ${auth.toFixed(0)}ms of that, and bcrypt ${hashing.toFixed(0)}ms of the auth fixture.`,
    );
    const spawn = perPhase.cliVersion.median;
    const cached = perPhase.cliVersionCached.median;
    const work = perPhase.cliInstall.median - spawn;
    lines.push('');
    lines.push(
      `Of the \`cliInstall\` ${perPhase.cliInstall.median.toFixed(0)}ms, **${spawn.toFixed(0)}ms is launching the CLI at all** (\`--version\` does no API call and writes nothing) and ${work.toFixed(0)}ms is the command's own work. Over the file that is ${over(spawn)}s of pure process startup against ${over(work)}s of work.`,
    );
    lines.push('');
    const saved = spawn - cached;
    lines.push(
      `With \`NODE_COMPILE_CACHE\` warmed, the same spawn takes ${cached.toFixed(0)}ms — **${saved > 0 ? '−' : '+'}${Math.abs(saved).toFixed(0)}ms (${((Math.abs(saved) / spawn) * 100).toFixed(0)}%)**, or ${over(Math.abs(saved))}s over the file, for an environment variable and no code change.`,
    );
  } else {
    lines.push(
      `Of that, **${over(hashing)}s** sits in \`signup\` + \`signin\` — the two calls that each perform one bcrypt operation.`,
    );
  }
  lines.push('');
  lines.push(
    "Sequential and unloaded, so this is a floor: under the real run the API serves several Jest workers at once, and the git and CLI subprocesses compete with them. Compare it against the file's measured duration to see how much is accounted for.",
  );

  process.stdout.write(`${lines.join('\n')}\n`);
}

await main().catch((error) => {
  // A connection refusal is the likely failure in CI, and a raw stack trace
  // buries it. Say which URL was unreachable and stop.
  // Node reports a refused connection as `TypeError: fetch failed`, with the
  // real code one or two levels down and sometimes inside an AggregateError.
  const cause =
    error?.cause?.code ??
    error?.cause?.errors?.[0]?.code ??
    error?.code ??
    (error?.message === 'fetch failed' ? 'connection failed' : undefined);
  process.stderr.write(
    cause
      ? `Cannot reach ${baseUrl()} (${cause}). Is the stack up and PACKMIND_INSTANCE_URL right?\n`
      : `${error?.message ?? error}\n`,
  );
  process.exit(1);
});
