#!/usr/bin/env node
/**
 * Times bcrypt's hash and compare at several cost factors on the current
 * machine, and projects what the CLI-E2E suite pays for them.
 *
 * `UserService` hardcodes `saltRounds = 10`. Every CLI-E2E test signs a fresh
 * user up and signs it in, so each test costs one `hash` and one `compare` at
 * that factor — and unlike the rest of that suite, which waits on subprocesses
 * and HTTP, this is CPU-bound work competing with the Jest workers for cores.
 *
 * Run it where bcrypt is actually built. On CI that means inside the API
 * container, since the benchmark's host install passes `--ignore-scripts`:
 *
 *   docker compose exec -T backend node scripts/measure-bcrypt-cost.mjs
 *
 * The point is to size the saving before deciding whether making the factor
 * configurable is worth touching production code for.
 */

import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const options = { rounds: [4, 6, 8, 10], samples: 5, tests: 287 };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--rounds') {
      options.rounds = argv[++index].split(',').map(Number);
    } else if (flag === '--samples') {
      options.samples = Number(argv[++index]);
    } else if (flag === '--tests') {
      options.tests = Number(argv[++index]);
    } else {
      process.stderr.write(`Unknown argument: ${flag}\n`);
      process.exit(1);
    }
  }
  return options;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function measure(bcrypt, rounds, samples) {
  // bcrypt's cost depends on the factor and not on the input, so the value is
  // irrelevant here — generated rather than written out, so no literal in this
  // repo looks like a credential.
  const password = randomUUID();
  const hashes = [];
  const compares = [];

  for (let index = 0; index < samples; index += 1) {
    let started = performance.now();
    const hash = await bcrypt.hash(password, rounds);
    hashes.push(performance.now() - started);

    started = performance.now();
    await bcrypt.compare(password, hash);
    compares.push(performance.now() - started);
  }

  return { rounds, hash: median(hashes), compare: median(compares) };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  let bcrypt;
  try {
    bcrypt = require('bcrypt');
  } catch (error) {
    process.stderr.write(
      `Cannot load bcrypt (${error?.code ?? error?.message}). Run this where its native ` +
        'binding is built — inside the API container, not on a host installed with ' +
        '--ignore-scripts.\n',
    );
    process.exit(1);
  }

  // Warm up: the first hash pays the native module's own lazy setup.
  await measure(bcrypt, Math.min(...options.rounds), 1);

  const results = [];
  for (const rounds of options.rounds) {
    results.push(await measure(bcrypt, rounds, options.samples));
  }

  const baseline = results.find((r) => r.rounds === 10) ?? results.at(-1);
  const perTest = (r) => r.hash + r.compare;
  const projected = (r) => (perTest(r) * options.tests) / 1000;

  const lines = [];
  lines.push('## bcrypt cost by factor');
  lines.push('');
  lines.push(
    `Median of ${options.samples} samples. Projected over ${options.tests} tests, each paying one hash (signup) and one compare (signin).`,
  );
  lines.push('');
  lines.push(
    '| Rounds | hash | compare | Per test | Over the suite | vs rounds=10 |',
  );
  lines.push('| --: | --: | --: | --: | --: | --: |');
  for (const result of results) {
    const delta =
      result === baseline
        ? 'baseline'
        : `−${(projected(baseline) - projected(result)).toFixed(1)}s`;
    lines.push(
      `| ${result.rounds}${result.rounds === 10 ? ' *(today)*' : ''} | ${result.hash.toFixed(0)}ms | ${result.compare.toFixed(0)}ms | ${perTest(result).toFixed(0)}ms | ${projected(result).toFixed(1)}s | ${delta} |`,
    );
  }
  lines.push('');
  lines.push(
    'This is CPU-bound, so it does not overlap with the workers the way the suite\'s HTTP and subprocess waiting does: it competes with them for cores. Compare "over the suite" against the suite\'s serial cost to judge the share.',
  );

  process.stdout.write(`${lines.join('\n')}\n`);
}

await main();
