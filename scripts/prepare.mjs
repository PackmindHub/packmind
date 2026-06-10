#!/usr/bin/env node
import { execSync } from 'node:child_process';

if (process.env.CI) {
  process.exit(0);
}

execSync('pnpm husky', { stdio: 'inherit' });
execSync('pnpm chakra:typegen', { stdio: 'inherit' });
