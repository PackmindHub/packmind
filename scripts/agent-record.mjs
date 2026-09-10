#!/usr/bin/env node
// scripts/agent-record.mjs
//
// Validates a unit-executor's return record and appends it to the feature's
// records.jsonl.
//
// The validation is the point. Brief 2 §2's correction to the flat-capability
// finding is that on repo-level code, format adherence fails before reasoning
// does — a cheap executor's valid-patch rate drops long before its answers get
// worse. A malformed record that the orchestrator hand-parses anyway is how
// that failure becomes invisible, so it is caught here and routed as one.
//
//   agent-record.mjs --file <record.json> [--attempt N] [--tier haiku] [--check]
//   … | agent-record.mjs --attempt 1 --tier haiku
//
// `--check` validates without appending. Exit 0 pass, 1 invalid, 2 usage.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(
  ROOT,
  '.claude/pipeline/return-record.schema.json',
);

// ---------------------------------------------------------------- validation

/**
 * The subset of JSON Schema the record shape actually uses. A dependency for
 * this would mean editing package.json, which the gate treats as a guardrail —
 * and the error messages a hand-rolled pass gives are better for re-specing,
 * because they name the field rather than a JSON pointer.
 */
function validate(value, schema, at = '') {
  const errs = [];
  const here = at || '(root)';

  const types = schema.type ? [].concat(schema.type) : null;
  if (types) {
    const actual =
      value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const ok = types.some((t) =>
      t === 'integer' ? Number.isInteger(value) : t === actual,
    );
    if (!ok) return [`${here}: expected ${types.join(' or ')}, got ${actual}`];
  }
  if (schema.enum && !schema.enum.includes(value)) {
    return [
      `${here}: expected one of ${schema.enum.join(', ')}, got ${JSON.stringify(value)}`,
    ];
  }
  if (value === null) return errs;

  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errs.push(
        `${here}: ${JSON.stringify(value)} does not match ${schema.pattern}`,
      );
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errs.push(
        `${here}: ${value.length} characters, limit is ${schema.maxLength}`,
      );
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) =>
      errs.push(...validate(v, schema.items, `${at}[${i}]`)),
    );
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!(key in value))
        errs.push(`${here}: missing required field \`${key}\``);
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties))
          errs.push(`${here}: unknown field \`${key}\``);
      }
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in value)
        errs.push(...validate(value[key], sub, at ? `${at}.${key}` : key));
    }
  }

  return errs;
}

/** Rules the schema cannot express, each one a routing signal if violated. */
function crossFieldErrors(rec) {
  const errs = [];
  if (rec.status === 'blocked' && !rec.blocked) {
    errs.push('status is `blocked` but `blocked` is null — say what you need');
  }
  if (rec.status === 'done' && rec.blocked) {
    errs.push('status is `done` but `blocked` is set — pick one');
  }
  if (rec.status === 'done' && !rec.files_touched.length) {
    errs.push(
      'status is `done` with no files touched — a unit that changed nothing is not done',
    );
  }
  if (
    rec.self_check &&
    rec.self_check.passed === false &&
    rec.status === 'done'
  ) {
    errs.push(
      'self_check failed but status is `done` — return `blocked`, or fix it',
    );
  }
  return errs;
}

// ---------------------------------------------------------------------- main

function parseArgs(argv) {
  const args = { file: null, attempt: 1, tier: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'check') args.check = true;
    else if (key in args)
      args[key] = key === 'attempt' ? Number(argv[++i]) : argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const raw = args.file
  ? fs.readFileSync(path.resolve(args.file), 'utf8')
  : fs.readFileSync(0, 'utf8');

// Executors wrap JSON in fences more often than they get the fields wrong.
// Unwrapping is not leniency about the shape — everything below is still strict.
const unfenced = raw
  .trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/```\s*$/, '');

let rec;
try {
  rec = JSON.parse(unfenced);
} catch (e) {
  process.stdout.write(`FAIL record-parse\n\n${e.message}\n`);
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const errs = [...validate(rec, schema), ...crossFieldErrors(rec)];

if (errs.length) {
  process.stdout.write(
    'FAIL record-shape\n\n' + errs.map((e) => `  ${e}`).join('\n') + '\n',
  );
  process.exit(1);
}

if (args.check) {
  process.stdout.write('OK\n');
  process.exit(0);
}

const out = path.join(ROOT, '.claude/features', rec.feature, 'records.jsonl');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.appendFileSync(
  out,
  JSON.stringify({
    ts: new Date().toISOString(),
    attempt: args.attempt,
    tier: args.tier,
    ...rec,
  }) + '\n',
);
process.stdout.write('OK\n');
