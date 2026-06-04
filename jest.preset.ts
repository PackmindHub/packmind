// Thin re-export of the canonical preset in `jest.preset.js`, so the many
// jest.config.ts files that reference `../../jest.preset.ts` get the exact same
// config.
//
// IMPORTANT: Jest loads a `preset` by require()-ing the file as plain CommonJS —
// it does NOT transpile TypeScript here. So despite the `.ts` extension this file
// must contain plain CJS. The previous `export const nxPreset = { ... }` was TS/ESM
// syntax, which threw "Unexpected token 'export'"; Jest swallowed it and fell back
// to its defaults, so testTimeout/setupFiles/etc. declared here never applied and
// every spec ran with the 5s default timeout.
// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require('./jest.preset.js');
