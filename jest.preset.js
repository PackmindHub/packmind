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
module.exports = {
  ...nxPreset,
  testTimeout: 30000,
  passWithNoTests: true,
};
