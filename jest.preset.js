// eslint-disable-next-line @typescript-eslint/no-require-imports
const nxPreset = require('@nx/jest/preset').default;

// Single source of truth for the Jest preset across the monorepo. Both
// `jest.preset.js` and `jest.preset.ts` (a thin re-export) resolve here.
//
// testTimeout is raised from Jest's 5s default: DB-backed repository specs
// (pg-mem fixture init in beforeAll/beforeEach) are slow on CI and on
// memory-constrained runners and were spuriously timing out.
//
// NOTE: this intentionally does NOT enable resetMocks/restoreMocks or the
// setup files that the old (broken, never-loaded) jest.preset.ts declared —
// turning those on repo-wide changes mock behavior between tests and must be a
// separate, suite-validated change. This commit only fixes the timeout.
// PACKMIND_JEST_MAX_WORKERS lets CI cap workers per project without a CLI flag.
// A forwarded `-- --maxWorkers=N` applies to every project in a run-many and
// cannot be overridden per project, which is fatal for @packmind/integration-tests:
// it has few, long spec files, so one worker serialises them. Going through the
// preset instead means a project that declares its own `maxWorkers` keeps it,
// because a project config overrides the preset.
//
// Unset — as on a developer machine — leaves Jest's default (cores - 1).
const maxWorkersOverride = process.env['PACKMIND_JEST_MAX_WORKERS'];

module.exports = {
  ...nxPreset,
  testTimeout: 30000,
  passWithNoTests: true,
  ...(maxWorkersOverride ? { maxWorkers: Number(maxWorkersOverride) } : {}),
};
