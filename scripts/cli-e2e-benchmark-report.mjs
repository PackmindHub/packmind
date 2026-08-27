#!/usr/bin/env node
/**
 * Turns the Jest JSON report of `cli-e2e-tests` into timing metrics, so that
 * changes to the suite or to its CI environment can be compared on numbers
 * instead of on the single "Time: Xs" line Jest prints.
 *
 * The metrics that matter for this suite:
 *
 * - `wall`       what CI actually waits for.
 * - `serial`     the sum of every suite's duration: the work to spread over
 *                the workers. Shrinking this is the only way to go faster once
 *                the workers are saturated.
 * - `floor`      the longest single suite. Jest cannot finish before it, no
 *                matter how many workers are available, so it is the hard
 *                lower bound for `wall` and the argument for splitting a suite.
 *                When `floor` meets `wall`, the workers are idling on that one
 *                file and no extra capacity will help until it is split.
 * - `per test`   a suite's duration divided by its test count. Because every
 *                `it` here re-runs the whole `describeWithUserSignedUp` setup,
 *                this is the cost of one full setup-and-act cycle, and the
 *                number to watch when changing how tests get their fixtures.
 * - `outside`    a suite's duration minus the sum of its test durations: module
 *                load and top-level setup. Note this is NOT the per-test hook
 *                cost — jest-circus starts a test's clock before its
 *                `beforeEach` hooks run, so hook time is already inside each
 *                test's own duration. Separating the two needs instrumentation
 *                Jest's JSON does not carry, which is why `per test` above is
 *                the metric to use for the fixture question.
 *
 * Usage:
 *   node scripts/cli-e2e-benchmark-report.mjs report <jest.json> [--label <name>]
 *   node scripts/cli-e2e-benchmark-report.mjs compare <a.json> <b.json> [...]
 *
 * `report` writes a Markdown summary to stdout; `compare` prints one row per
 * report so several CI variants can be read side by side. Append to
 * $GITHUB_STEP_SUMMARY to surface either in the job summary.
 */

import fs from 'node:fs';
import path from 'node:path';

const USAGE = `Usage:
  node scripts/cli-e2e-benchmark-report.mjs report <jest.json> [--label <name>] [--workers <n>]
  node scripts/cli-e2e-benchmark-report.mjs compare <a.json> <b.json> [...]`;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function seconds(ms) {
  return (ms / 1000).toFixed(1);
}

/**
 * Suite time per test. Every `it` in this suite re-runs the whole
 * `describeWithUserSignedUp` setup, so this average is the cost of one
 * setup-and-act cycle rather than a meaningless mean.
 */
function perTestMs(totalMs, testCount) {
  return testCount > 0 ? `${(totalMs / testCount).toFixed(0)}ms` : '—';
}

/**
 * Calls out the case that decides whether extra workers are worth buying: the
 * longest file taking up the whole run.
 */
function floorNote(metrics) {
  const atWall = metrics.wall > 0 && metrics.floor / metrics.wall >= 0.95;
  return `${seconds(metrics.floor)}s${atWall ? ' **at wall**' : ''}`;
}

function readJestReport(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch {
    fail(`Cannot read Jest report: ${file}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }
}

const SUITE_ROOT = `apps${path.sep}cli-e2e-tests${path.sep}src${path.sep}`;

/**
 * Jest records absolute paths; keep only the part below the suite root so the
 * tables stay readable wherever the report was produced.
 */
function suiteName(absolutePath) {
  const index = absolutePath.lastIndexOf(SUITE_ROOT);
  return index === -1
    ? path.basename(absolutePath)
    : absolutePath.slice(index + SUITE_ROOT.length);
}

/**
 * Collapses a Jest JSON report into the metrics described at the top of this
 * file. `label` and `workers` are contextual — Jest does not record either.
 */
function analyze(report, { label, workers }) {
  const suites = (report.testResults ?? []).map((suite) => {
    const tests = suite.assertionResults ?? [];
    const duration = Math.max(0, (suite.endTime ?? 0) - (suite.startTime ?? 0));
    const testTime = tests.reduce((sum, test) => sum + (test.duration ?? 0), 0);

    return {
      name: suiteName(suite.name),
      duration,
      testTime,
      // Everything Jest spent in the suite outside a test body. That is
      // module load and top-level setup only: jest-circus folds each test's
      // before/after hooks into that test's own duration.
      outsideTests: Math.max(0, duration - testTime),
      testCount: tests.filter((test) => test.status !== 'pending').length,
      skipped: tests.filter((test) => test.status === 'pending').length,
      tests,
    };
  });

  suites.sort((a, b) => b.duration - a.duration);

  const serial = suites.reduce((sum, suite) => sum + suite.duration, 0);
  const startTime = report.startTime ?? 0;
  const endTime = (report.testResults ?? []).reduce(
    (latest, suite) => Math.max(latest, suite.endTime ?? 0),
    startTime,
  );
  const wall = Math.max(0, endTime - startTime);
  const floor = suites.length > 0 ? suites[0].duration : 0;
  const outsideTests = suites.reduce(
    (sum, suite) => sum + suite.outsideTests,
    0,
  );

  const slowestTests = suites
    .flatMap((suite) =>
      suite.tests
        .filter((test) => test.status !== 'pending')
        .map((test) => ({
          suite: suite.name,
          title: test.fullName ?? test.title,
          duration: test.duration ?? 0,
        })),
    )
    .sort((a, b) => b.duration - a.duration);

  return {
    label: label ?? 'run',
    workers: workers ?? null,
    wall,
    serial,
    floor,
    outsideTests,
    testTime: serial - outsideTests,
    suiteCount: suites.length,
    testCount: suites.reduce((sum, suite) => sum + suite.testCount, 0),
    skipped: suites.reduce((sum, suite) => sum + suite.skipped, 0),
    // How much of the available worker time was doing test work. Below ~0.8
    // the workers are starved (long tail, uneven suites); at ~1.0 they are
    // saturated and only less `serial` work or more workers can help.
    efficiency: workers && wall > 0 ? serial / (wall * workers) : null,
    suites,
    slowestTests,
  };
}

function renderReport(metrics) {
  const lines = [];

  lines.push(`## CLI E2E timings — \`${metrics.label}\``);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Wall clock | **${seconds(metrics.wall)}s** |`);
  lines.push(`| Serial cost (Σ suites) | ${seconds(metrics.serial)}s |`);
  lines.push(
    `| Floor (longest suite) | ${seconds(metrics.floor)}s — \`${metrics.suites[0]?.name ?? 'n/a'}\` |`,
  );
  lines.push(
    `| Cost per test | ${perTestMs(metrics.serial, metrics.testCount)} |`,
  );
  lines.push(
    `| Outside test bodies | ${seconds(metrics.outsideTests)}s (module load and top-level setup) |`,
  );
  lines.push(
    `| Suites / tests | ${metrics.suiteCount} / ${metrics.testCount}${metrics.skipped ? ` (+${metrics.skipped} skipped)` : ''} |`,
  );
  if (metrics.workers) {
    lines.push(`| Workers | ${metrics.workers} |`);
  }
  if (metrics.efficiency !== null) {
    lines.push(`| Worker efficiency | ${metrics.efficiency.toFixed(2)} |`);
  }
  lines.push('');

  lines.push('### Per suite');
  lines.push('');
  lines.push('| Suite | Duration | Tests | Per test | Outside tests |');
  lines.push('| --- | --: | --: | --: | --: |');
  for (const suite of metrics.suites) {
    lines.push(
      `| \`${suite.name}\` | ${seconds(suite.duration)}s | ${suite.testCount} | ${perTestMs(suite.duration, suite.testCount)} | ${seconds(suite.outsideTests)}s |`,
    );
  }
  lines.push('');

  const slowest = metrics.slowestTests.slice(0, 15);
  if (slowest.length > 0) {
    lines.push('### Slowest test bodies');
    lines.push('');
    lines.push('| Test | Suite | Duration |');
    lines.push('| --- | --- | --: |');
    for (const test of slowest) {
      lines.push(
        `| ${test.title} | \`${test.suite}\` | ${seconds(test.duration)}s |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderComparison(all) {
  const [baseline] = all;
  const lines = [];

  lines.push('## CLI E2E benchmark — variant comparison');
  lines.push('');
  lines.push(
    '| Variant | Wall | vs baseline | Serial | Floor | Per test | Workers | Efficiency |',
  );
  lines.push('| --- | --: | --: | --: | --: | --: | --: | --: |');
  for (const metrics of all) {
    const delta =
      baseline.wall > 0
        ? `${(((metrics.wall - baseline.wall) / baseline.wall) * 100).toFixed(0)}%`
        : '—';
    lines.push(
      `| \`${metrics.label}\` | **${seconds(metrics.wall)}s** | ${metrics === baseline ? 'baseline' : delta} | ${seconds(metrics.serial)}s | ${floorNote(metrics)} | ${perTestMs(metrics.serial, metrics.testCount)} | ${metrics.workers ?? '—'} | ${metrics.efficiency?.toFixed(2) ?? '—'} |`,
    );
  }
  lines.push('');
  lines.push(
    '`Serial` is the work to spread over the workers, `Floor` the longest single suite (the hard lower bound on `Wall`), `Per test` a suite-time-per-test average that stands in for one full setup-and-act cycle.',
  );
  lines.push('');
  lines.push(
    'A `Floor` flagged **at wall** means the workers are idling on that one file: more of them, or a bigger runner, buys nothing until it is split.',
  );

  return lines.join('\n');
}

/**
 * A benchmark report carries its label and worker count in the file name
 * (`<label>.workers-<n>.json`) because Jest's JSON records neither.
 */
function metadataFromFileName(file) {
  const base = path.basename(file).replace(/\.json$/, '');
  const match = base.match(/^(.*?)\.workers-(\d+)$/);
  if (match) {
    return { label: match[1], workers: Number(match[2]) };
  }
  return { label: base, workers: null };
}

function main(argv) {
  const [command, ...rest] = argv;

  if (command === 'report') {
    const files = [];
    let label;
    let workers;
    for (let index = 0; index < rest.length; index += 1) {
      if (rest[index] === '--label') {
        label = rest[(index += 1)];
      } else if (rest[index] === '--workers') {
        workers = Number(rest[(index += 1)]);
      } else {
        files.push(rest[index]);
      }
    }
    if (files.length !== 1) {
      fail(USAGE);
    }
    const fromName = metadataFromFileName(files[0]);
    const metrics = analyze(readJestReport(files[0]), {
      label: label ?? fromName.label,
      workers: workers ?? fromName.workers,
    });
    process.stdout.write(`${renderReport(metrics)}\n`);
    return;
  }

  if (command === 'compare') {
    if (rest.length === 0) {
      fail(USAGE);
    }
    const all = rest.map((file) =>
      analyze(readJestReport(file), metadataFromFileName(file)),
    );
    process.stdout.write(`${renderComparison(all)}\n`);
    return;
  }

  fail(USAGE);
}

main(process.argv.slice(2));
