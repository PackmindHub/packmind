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

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

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
  const cmd = cfg.commands.scoped + files.join(',');
  const r = run(cmd, env);
  record('scoped', r.code === 0, r.seconds);
  if (r.code !== 0) {
    const d = distillNx(r.stdout);
    // The literal command carries every changed path and is unusable as a
    // reproduce line; the failing task is what the caller actually needs.
    fail(spec, args, 'scoped', d.reproduce ?? cmd, d.output);
  }
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

function stepTests(spec, args, env) {
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
  const r = run(cmd, env);
  record('tests', r.code === 0, r.seconds);
  if (r.code !== 0) fail(spec, args, 'tests', cmd, distillJest(r.stdout));
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
  writeMetrics(null, args, 'pass', null, { files_changed: changed.length });
  process.stdout.write('OK\n');
  process.exit(PASS);
}

const spec = readJson(path.resolve(args.spec));
const changed = stepScope(cfg, spec, args);
stepAutofix(cfg, changed, env);
stepScoped(cfg, spec, args, changedFiles(), env);
stepWide(cfg, spec, args, changed, env);
stepTests(spec, args, env);
pass(spec, args);
