#!/usr/bin/env node
// scripts/agent-gate.mjs
//
// The verification gate for the agentic development pipeline.
//
// Output contract, and the reason for it: the orchestrator reads this output as
// tokens. A gate that prints Nx's usual few hundred lines on every unit would
// spend a real fraction of the one context the pipeline exists to protect. So:
// the happy path prints `OK` and nothing else, and a failure prints the failing
// step alone, colour stripped, with the single command that reproduces it.
//
//   agent-gate.mjs baseline
//   agent-gate.mjs unit  --spec <file.json> [--attempt N] [--tier haiku]
//   agent-gate.mjs sweep [--attempt N] [--tier haiku]
//
// `--config <path>` overrides gate.config.json. The orchestrator is the only
// caller, never the executor, so this is not a hole an executor can reach — and
// a non-default path is written into every metrics line, so a run against a
// permissive config is visible in the audit trail rather than silent.
//
// Exit codes: 0 pass, 1 gate failure, 2 halt (invariant violated / bad usage).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.claude/pipeline/gate.config.json');

const PASS = 0;
const FAIL = 1;
const HALT = 2;

// ---------------------------------------------------------------- utilities

// Built from the char code rather than written literally: an ESC in a regex
// literal trips no-control-regex, and this file has to pass its own gate.
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*[A-Za-z]', 'g');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** Glob subset: `**` any depth, `*` within a segment, `?` one character. */
function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` may also match zero directories, so `a/**/b.ts` matches `a/b.ts`.
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(out + '$');
}

const matchesAny = (file, globs) =>
  (globs || []).some((g) => globToRegExp(g).test(file));

/** Working-tree changes, tracked and untracked, as repo-relative paths. */
function changedFiles() {
  const out = run('git status --porcelain=v1 --untracked-files=all', {});
  return out.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // `XY path` or, for renames, `XY old -> new`; the new path is what exists.
      const p = line.slice(3);
      const arrow = p.indexOf(' -> ');
      return arrow === -1 ? p : p.slice(arrow + 4);
    })
    .map((p) => p.replace(/^"|"$/g, ''));
}

function run(command, env) {
  const started = Date.now();
  const res = spawnSync(command, {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  return {
    code: res.status ?? 1,
    stdout: ((res.stdout || '') + (res.stderr || '')).replace(ANSI, ''),
    seconds: (Date.now() - started) / 1000,
  };
}

// ------------------------------------------------------------------ distilling

const MAX_LINES = 120;
const MAX_CHARS = 8000;

function cap(text) {
  const lines = text.split('\n');
  let out =
    lines.length > MAX_LINES
      ? [
          `… ${lines.length - MAX_LINES} earlier lines omitted`,
          ...lines.slice(-MAX_LINES),
        ].join('\n')
      : text;
  if (out.length > MAX_CHARS) out = `… truncated\n` + out.slice(-MAX_CHARS);
  return out;
}

const NOISE = [
  /^\(node:\d+\) Warning:/,
  /^\(Use `node --trace-warnings/,
  /^\s*$/,
];

/**
 * Nx prints every task it ran, cached or not, then names the ones that failed.
 * Only the failed tasks' blocks say anything the orchestrator can act on, and
 * only the first failed task is worth a reproduce line — under --nxBail the
 * rest are collateral. Falls back to the tail if the format ever changes.
 */
function distillNx(raw) {
  const failed = [];
  const failedSection = raw.split(/^Failed tasks:\s*$/m)[1];
  if (failedSection) {
    for (const line of failedSection.split('\n')) {
      const m = line.match(/^\s*-\s+(\S+)\s*$/);
      if (m) failed.push(m[1]);
      else if (failed.length && line.trim() === '') break;
    }
  }
  if (!failed.length) return { reproduce: null, output: cap(raw) };

  const blocks = [];
  for (const task of failed) {
    const start = raw.indexOf(`> nx run ${task}`);
    if (start === -1) continue;
    const rest = raw.slice(start);
    const next = rest
      .slice(1)
      .search(/\n> nx run |\n\s*NX\s{2}|\n {2}Run duration:/);
    blocks.push(next === -1 ? rest : rest.slice(0, next + 1));
  }
  const body = (blocks.length ? blocks.join('\n') : raw)
    .split('\n')
    .filter((l) => !NOISE.some((n) => n.test(l)))
    .join('\n');

  return {
    reproduce: `./node_modules/.bin/nx run ${failed[0]}`,
    output:
      cap(body) +
      (failed.length > 1
        ? `\n\nalso failed: ${failed.slice(1).join(', ')}`
        : ''),
  };
}

/** Jest buries the assertion under its own preamble; the `●` blocks are the signal. */
function distillJest(raw) {
  const at = raw.search(/\n\s+● /);
  return cap(at === -1 ? raw : raw.slice(at + 1));
}

/**
 * Jest's summary line, as `23 skipped, 22 passed, 45 total`.
 *
 * Exit 0 is not evidence that the criterion asserted anything. A
 * `--testNamePattern` that matches nothing skips every test and still exits 0,
 * and so does a criterion naming a test the executor never wrote. That is the
 * exact failure the gate exists to prevent, so the count is read rather than
 * assumed. Returns null when the output carries no jest summary at all.
 */
function assertionsRun(raw) {
  const m = raw.match(/^\s*Tests:\s+(.+)$/m);
  if (!m) return null;
  const passed = m[1].match(/(\d+)\s+passed/);
  return { passed: passed ? Number(passed[1]) : 0, summary: m[1].trim() };
}

// ------------------------------------------------------------------ reporting

const steps = [];

function record(stage, ok, seconds) {
  steps.push({ stage, ok, s: Number(seconds.toFixed(1)) });
}

function metricsPath(spec) {
  return spec?.feature
    ? path.join(ROOT, '.claude/features', spec.feature, 'metrics.jsonl')
    : path.join(ROOT, '.claude/pipeline/metrics.jsonl');
}

// The gate writes the metrics, not the orchestrator. An instrumentation step the
// caller has to remember is an instrumentation step that stops happening around
// unit twenty, which is exactly when brief 1 §6's numbers start being worth having.
function writeMetrics(spec, args, verdict, stageFailed, extra = {}) {
  const line = {
    ts: new Date().toISOString(),
    mode: args.mode,
    feature: spec?.feature ?? null,
    unit_id: spec?.unit_id ?? null,
    attempt: args.attempt,
    tier: args.tier,
    verdict,
    stage_failed: stageFailed,
    config: args.config ?? null,
    duration_s: Number(steps.reduce((a, s) => a + s.s, 0).toFixed(1)),
    steps,
    ...extra,
  };
  const p = metricsPath(spec);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(line) + '\n');
}

function pass(spec, args) {
  writeMetrics(spec, args, 'pass', null);
  process.stdout.write('OK\n');
  process.exit(PASS);
}

function fail(spec, args, stage, reproduce, output, extra = {}) {
  writeMetrics(spec, args, 'fail', stage, extra);
  process.stdout.write(`FAIL ${stage}\n`);
  if (reproduce) process.stdout.write(`reproduce: ${reproduce}\n`);
  if (output) process.stdout.write('\n' + output.trim() + '\n');
  process.exit(FAIL);
}

// Red at start is brief 2 §5.2's fourth outcome. It is not a unit failure and is
// written to metrics under its own verdict so it never lands in the pass rate.
function halt(spec, args, reason, output) {
  writeMetrics(spec, args, 'halt', reason);
  process.stdout.write(`HALT ${reason}\n`);
  if (output) process.stdout.write('\n' + output.trim() + '\n');
  process.exit(HALT);
}

// ----------------------------------------------------------------- gate steps

function stepScope(cfg, spec, args) {
  const started = Date.now();
  const changed = changedFiles();

  // A unit that changed nothing passes every remaining stage: an empty diff is
  // inside any declared scope, `nx affected` with no files is a no-op, and the
  // named test still goes green off the existing suite. Green alone is not
  // enough — a unit that does nothing is green — so the absence of work is a
  // failure here rather than a pass three stages later.
  const substantive = changed.filter((f) => !matchesAny(f, cfg.alwaysInScope));
  if (substantive.length === 0) {
    record('scope', false, (Date.now() - started) / 1000);
    fail(
      spec,
      args,
      'scope',
      'git status --porcelain=v1 --untracked-files=all',
      'The unit changed no files. Nothing was implemented, so nothing can be\n' +
        'verified: the exit criterion would pass off the existing suite.\n\n' +
        'If the work was already done by an earlier unit, the unit is redundant\n' +
        'and should be dropped rather than recorded as done.',
      { no_op: true },
    );
  }

  const guardrail = changed.filter((f) => matchesAny(f, cfg.guardrails));
  const outside = changed.filter(
    (f) =>
      !matchesAny(f, spec.files_in_scope) &&
      !matchesAny(f, cfg.alwaysInScope) &&
      !guardrail.includes(f),
  );
  record(
    'scope',
    guardrail.length === 0 && outside.length === 0,
    (Date.now() - started) / 1000,
  );

  if (guardrail.length) {
    fail(
      spec,
      args,
      'scope',
      'git diff --name-only',
      `Guardrail files were modified. These are never in scope for a unit; a rule\n` +
        `change goes through its own human-authored unit.\n\n` +
        guardrail.map((f) => `  ${f}`).join('\n'),
      { guardrail_touched: guardrail },
    );
  }
  if (outside.length) {
    fail(
      spec,
      args,
      'scope',
      'git diff --name-only',
      `Modified outside the declared file set.\n\n` +
        `declared:\n${spec.files_in_scope.map((f) => `  ${f}`).join('\n')}\n\n` +
        `undeclared:\n${outside.map((f) => `  ${f}`).join('\n')}`,
      { scope_violations: outside },
    );
  }
  return changed;
}

// Brief 2 §3.1: autofix runs on the executor's output, it is never something the
// executor is asked to satisfy. Format obligations compete for the same capacity
// that produces valid edits, and this costs nothing to do here instead.
function stepAutofix(cfg, changed, env) {
  const started = Date.now();
  const present = changed.filter((f) => fs.existsSync(path.join(ROOT, f)));
  const lintable = present.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
  if (present.length)
    run(`${cfg.commands.formatFix} ${present.map(q).join(' ')}`, env);
  if (lintable.length)
    run(`${cfg.commands.lintFix} ${lintable.map(q).join(' ')}`, env);
  record('autofix', true, (Date.now() - started) / 1000);
}

const q = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

function stepScoped(cfg, spec, args, changed, env) {
  const files = changed.filter((f) => fs.existsSync(path.join(ROOT, f)));
  if (!files.length) return;
  // Quoted for the same reason stepAutofix quotes: these paths are whatever the
  // executor created, the run below is `shell: true`, and scope validation is
  // glob-only — `packages/x/$(...).ts` satisfies `packages/x/**/*.ts`. One
  // argument, so the joined list is quoted whole rather than file by file.
  const cmd = cfg.commands.scoped + q(files.join(','));
  const r = run(cmd, env);
  record('scoped', r.code === 0, r.seconds);
  if (r.code !== 0) {
    const d = distillNx(r.stdout);
    // The literal command carries every changed path and is unusable as a
    // reproduce line; the failing task is what the caller actually needs.
    fail(spec, args, 'scoped', d.reproduce ?? cmd, d.output);
  }
}

// The Packmind CLI enforces this repo's own coding standards, which ESLint knows
// nothing about — a unit can be green under `scoped` and `wide` and still break
// CI on a rule none of them check. Changed files only, so a violation names the
// unit that introduced it rather than inheriting one from a file nobody touched.
//
// The awkward part is that the CLI exits 1 for two unrelated reasons: it found
// violations, and it could not run at all (no key, an expired key, no network,
// not built). Treating the second as a unit failure would blame the executor for
// the environment and turn the metrics into noise — the same reason `baseline`
// exists. So an unavailable checker is recorded as skipped and the unit proceeds;
// CI runs the identical lint with a valid key and remains the backstop for
// violations. The skip is written to metrics, never silent.
const STANDARDS_UNAVAILABLE =
  /invalid or expired api key|api key is not set|api key is missing|unauthorized|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed|socket hang up/i;

function stepStandards(cfg, spec, args, env) {
  const cmd = cfg.commands?.packmindLint;
  if (!cmd) return;

  const bin = cfg.packmindLintBinary;
  if (bin && !fs.existsSync(path.join(ROOT, bin))) {
    record('standards-skipped:not-built', true, 0);
    return;
  }

  const r = run(cmd, env);
  if (r.code !== 0 && STANDARDS_UNAVAILABLE.test(r.stdout)) {
    record('standards-skipped:unavailable', true, r.seconds);
    return;
  }

  record('standards', r.code === 0, r.seconds);
  // A standards violation is a specification failure, not a capability one: the
  // executor wrote valid code against a house rule it was never told about. It
  // re-specs at the same tier with the rule quoted, like `tests`.
  if (r.code !== 0) fail(spec, args, 'standards', cmd, r.stdout);
}

// Scoped and repo-wide detect different things. The orchestrator never reads code,
// so the dangerous failure is action at a distance: a signature change that is
// green everywhere inside the declared scope and red in a caller it never touched.
// A scope-filtered check cannot see that; the evidence was filtered out.
function stepWide(cfg, spec, args, changed, env) {
  const r = run(cfg.commands.wide, env);
  record('wide', r.code === 0, r.seconds);
  if (r.code !== 0) fail(spec, args, 'wide', cfg.commands.wide, r.stdout);

  if (changed.some((f) => matchesAny(f, cfg.frontendTypecheckWhen))) {
    const t = run(cfg.commands.frontendTypecheck, env);
    record('typecheck', t.code === 0, t.seconds);
    if (t.code !== 0)
      fail(spec, args, 'typecheck', cfg.commands.frontendTypecheck, t.stdout);
  }
}

function stepTests(cfg, spec, args, env) {
  const cmd = spec.exit_criterion?.command;
  if (!cmd) {
    halt(
      spec,
      args,
      'no-exit-criterion',
      'The spec declares no exit_criterion.command. A unit boundary without a\n' +
        'machine-checkable gate is pure overhead — merge this unit into an\n' +
        'adjacent one that has a criterion, or split a characterization test out first.',
    );
  }

  const kind = spec.exit_criterion?.kind ?? 'behavioural';
  if (!['behavioural', 'characterization'].includes(kind)) {
    halt(
      spec,
      args,
      'bad-exit-criterion',
      `exit_criterion.kind must be "behavioural" or "characterization", got ` +
        `${JSON.stringify(kind)}.`,
    );
  }

  const r = run(cmd, env);
  record('tests', r.code === 0, r.seconds);
  if (r.code !== 0) fail(spec, args, 'tests', cmd, distillJest(r.stdout));

  const ran = assertionsRun(r.stdout);
  if (!ran) {
    fail(
      spec,
      args,
      'tests',
      cmd,
      'The criterion exited 0 but printed no test summary, so there is no\n' +
        "evidence it asserted anything. The gate reads jest's `Tests:` line.\n" +
        'Point the criterion at a jest run.',
      { assertions: null },
    );
  }
  if (ran.passed === 0) {
    fail(
      spec,
      args,
      'tests',
      cmd,
      'The criterion exited 0 but ran no assertion.\n' +
        `  Tests: ${ran.summary}\n\n` +
        'A test name that matches nothing is skipped, not failed, and jest still\n' +
        'exits 0. Write the named test, check the name in the criterion matches\n' +
        'it, or declare `"kind": "characterization"` if this unit is a refactor\n' +
        'with no observable delta.',
      { assertions: 0 },
    );
  }

  // A refactor has no new assertion to make; what it must show instead is that
  // the existing ones still hold and were not rewritten to fit the new code.
  if (kind === 'characterization') {
    const rewritten = changedFiles().filter((f) =>
      matchesAny(f, cfg.testFiles),
    );
    if (rewritten.length) {
      fail(
        spec,
        args,
        'tests',
        'git diff --name-only',
        'This unit declares `kind: characterization`, so it must not change\n' +
          'behaviour — but it modified test files:\n\n' +
          rewritten.map((f) => `  ${f}`).join('\n') +
          '\n\nA refactor that edits its own tests proves nothing. Either revert the\n' +
          'test changes, or this is a behavioural unit and needs a named test.',
        { characterization_touched_tests: rewritten },
      );
    }
  }
}

// ------------------------------------------------------------------- baseline

function checkNodeVersion(cfg) {
  const wanted = fs
    .readFileSync(path.join(ROOT, cfg.nodeVersionFile), 'utf8')
    .trim();
  const got = process.versions.node;
  if (wanted.split('.')[0] !== got.split('.')[0]) {
    return `${cfg.nodeVersionFile} asks for ${wanted}, running ${got}. Run \`nvm use\` first — every check below would fail for the wrong reason.`;
  }
  return null;
}

function baseline(cfg, args, env, { requireCleanTree = true } = {}) {
  const versionProblem = checkNodeVersion(cfg);
  if (versionProblem) halt(null, args, 'node-version', versionProblem);

  if (requireCleanTree) {
    const dirty = changedFiles().filter(
      (f) => !matchesAny(f, cfg.alwaysInScope),
    );
    if (dirty.length) {
      halt(
        null,
        args,
        'dirty-tree',
        'The working tree must be clean before a unit is dispatched — the scope\n' +
          'check reads the diff, so a unit starts from committed and green.\n\n' +
          dirty.map((f) => `  ${f}`).join('\n'),
      );
    }
  }

  for (const [stage, cmd] of [
    ['wide', cfg.commands.wide],
    ['typecheck', cfg.commands.frontendTypecheck],
    ['format', cfg.commands.formatCheck],
  ]) {
    const r = run(cmd, env);
    record(stage, r.code === 0, r.seconds);
    if (r.code !== 0)
      halt(
        null,
        args,
        `red-at-start:${stage}`,
        `reproduce: ${cmd}\n\n${r.stdout}`,
      );
  }
}

// ----------------------------------------------------------------------- main

function parseArgs(argv) {
  const mode = argv[0];
  const args = { mode, attempt: 1, tier: null, spec: null, config: null };
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (key in args)
      args[key] = key === 'attempt' ? Number(argv[i + 1]) : argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!['baseline', 'unit', 'sweep'].includes(args.mode)) {
  process.stdout.write(
    'HALT usage\n\nagent-gate.mjs baseline | unit --spec <file> | sweep' +
      '  [--attempt N] [--tier <name>] [--config <path>]\n',
  );
  process.exit(HALT);
}

const cfg = readJson(args.config ? path.resolve(args.config) : CONFIG_PATH);
const env = cfg.env;

if (args.mode === 'baseline') {
  baseline(cfg, args, env);
  writeMetrics(null, args, 'pass', null);
  process.stdout.write('OK\n');
  process.exit(PASS);
}

if (args.mode === 'sweep') {
  // Brief 2 §5.3: a mechanical sweep has no declared scope and no named test.
  // Repo-wide green is the whole instruction.
  const changed = changedFiles();
  stepAutofix(cfg, changed, env);
  stepWide(cfg, null, args, changed, env);
  stepStandards(cfg, null, args, env);
  writeMetrics(null, args, 'pass', null, { files_changed: changed.length });
  process.stdout.write('OK\n');
  process.exit(PASS);
}

const spec = readJson(path.resolve(args.spec));
const changed = stepScope(cfg, spec, args);
stepAutofix(cfg, changed, env);
stepScoped(cfg, spec, args, changedFiles(), env);
stepStandards(cfg, spec, args, env);
stepWide(cfg, spec, args, changed, env);
stepTests(cfg, spec, args, env);
pass(spec, args);
