// scripts/select-tsconfig.mjs
import fs from 'node:fs';
import path from 'node:path';

const PACKMIND_EDITION = (
  process.env.PACKMIND_EDITION ||
  process.env.VITE_PACKMIND_EDITION ||
  'private'
).toLowerCase();

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'tsconfig.base.json');
const PATHS = path.join(
  ROOT,
  PACKMIND_EDITION === 'oss'
    ? 'tsconfig.paths.oss.json'
    : 'tsconfig.paths.proprietary.json',
);
const OUT = path.join(ROOT, 'tsconfig.base.effective.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, obj) =>
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

function validateNxPaths(paths) {
  if (!paths) return;
  for (const [key, arr] of Object.entries(paths)) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error(`paths.${key} must be a non-empty array`);
    }
    const hasWildcard = key.includes('*');
    if (!hasWildcard && arr.length !== 1) {
      throw new Error(
        `paths.${key} should have exactly 1 target (no wildcard). Got ${arr.length}`,
      );
    }
  }
}

function main() {
  const base = readJson(BASE);
  const paths = readJson(PATHS);

  const baseCO = base.compilerOptions ?? {};
  const pathsCO = paths.compilerOptions ?? {};

  validateNxPaths(pathsCO.paths);
  const mergedPaths = { ...(baseCO.paths || {}), ...(pathsCO.paths || {}) };

  const effective = {
    ...base,
    compilerOptions: {
      ...baseCO,
      baseUrl: baseCO.baseUrl ?? '.',
      paths: mergedPaths,
    },
  };

  writeJson(OUT, effective);
  console.log(
    `[select-tsconfig] PACKMIND_EDITION=${PACKMIND_EDITION} -> ${path.basename(OUT)} (base + ${path.basename(PATHS)})`,
  );
}

main();
