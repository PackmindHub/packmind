// scripts/prepare-local-dev.mjs
// One-time-ish setup for native local development (run by `pnpm dev:setup`).
// Idempotent: safe to run on every `pnpm dev`.
//   1. Select the effective tsconfig for the current PACKMIND_EDITION.
//   2. Seed the local JS playground directory the api/mcp-server expect.
// Note: no .env is created — the localhost wiring is baked into
// scripts/dev-serve.sh. A .env is only for optional overrides/secrets.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
process.env.PACKMIND_EDITION = process.env.PACKMIND_EDITION || 'oss';

// 1. tsconfig selection
execFileSync('node', ['scripts/select-tsconfig.mjs'], { stdio: 'inherit' });

// 2. JS playground seed (api/mcp-server read JS_PLAYGROUND_PATH)
const playgroundSrc = path.join(ROOT, 'packages/linter/js-playground');
const playgroundDst = path.join(ROOT, 'packages/linter/js-playground-local');
if (fs.existsSync(playgroundSrc) && !fs.existsSync(playgroundDst)) {
  fs.cpSync(playgroundSrc, playgroundDst, { recursive: true });
  console.log('[prepare] seeded packages/linter/js-playground-local');
} else {
  console.log(
    '[prepare] js-playground-local present or source missing, skipping',
  );
}

console.log('[prepare] local dev setup complete');
