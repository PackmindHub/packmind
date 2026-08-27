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

const PHASES = ['signup', 'signin', 'generateApiKey', 'getGlobalSpace'];

function parseArgs(argv) {
  const options = { iterations: 30, tests: 287, warmup: 3 };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--iterations') options.iterations = Number(argv[++index]);
    else if (flag === '--tests') options.tests = Number(argv[++index]);
    else if (flag === '--warmup') options.warmup = Number(argv[++index]);
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

/** One full fixture setup, as `describeWithUserSignedUp` performs it. */
async function oneSetup(url) {
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
  timings.getGlobalSpace = (
    await timed(() =>
      fetch(`${url}/api/v0/organizations/${organizationId}/spaces/global`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKeyCall.value.apiKey}`,
        },
      }).then((response) => expectOk(response, 'getGlobalSpace')),
    )
  ).ms;

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
    await oneSetup(url);
  }

  const samples = Object.fromEntries(PHASES.map((phase) => [phase, []]));
  const totals = [];
  for (let index = 0; index < options.iterations; index += 1) {
    const timings = await oneSetup(url);
    let total = 0;
    for (const phase of PHASES) {
      samples[phase].push(timings[phase]);
      total += timings[phase];
    }
    totals.push(total);
  }

  const perPhase = Object.fromEntries(
    PHASES.map((phase) => [phase, stats(samples[phase])]),
  );
  const perSetup = stats(totals);

  const lines = [];
  lines.push('## CLI E2E fixture setup cost');
  lines.push('');
  lines.push(`Measured against \`${url}\`, ${options.iterations} sequences.`);
  lines.push('');
  lines.push('| Phase | Median | p90 | Min | Max |');
  lines.push('| --- | --: | --: | --: | --: |');
  for (const phase of PHASES) {
    const s = perPhase[phase];
    lines.push(
      `| \`${phase}\` | ${s.median.toFixed(0)}ms | ${s.p90.toFixed(0)}ms | ${s.min.toFixed(0)}ms | ${s.max.toFixed(0)}ms |`,
    );
  }
  lines.push(
    `| **one full setup** | **${perSetup.median.toFixed(0)}ms** | ${perSetup.p90.toFixed(0)}ms | ${perSetup.min.toFixed(0)}ms | ${perSetup.max.toFixed(0)}ms |`,
  );
  lines.push('');

  // The two password-hashing calls are the reason for measuring this at all.
  const hashing = perPhase.signup.median + perPhase.signin.median;
  const projected = (perSetup.median * options.tests) / 1000;
  const projectedHashing = (hashing * options.tests) / 1000;
  lines.push(
    `Across ${options.tests} tests, one setup per test: **${projected.toFixed(0)}s** of serial cost, of which **${projectedHashing.toFixed(0)}s** sits in \`signup\` + \`signin\` — the two calls that each perform one bcrypt operation.`,
  );
  lines.push('');
  lines.push(
    "Sequential and unloaded, so this is a floor: under the real run the API serves several Jest workers at once. Compare it against the suite's measured serial cost to see what share the fixture setup accounts for.",
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
