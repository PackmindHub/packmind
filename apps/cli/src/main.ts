import chalk from 'chalk';
import { run, subcommands } from 'cmd-ts';
import { lintCommand } from './infra/commands/LinterCommand';
import { BaseParser } from '@packmind/linter-ast';
import { extractWasmFiles, hasEmbeddedWasmFiles } from './wasm-runtime';
import { config as dotenvConfig } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { pullCommand } from './infra/commands/PullCommand';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../package.json');

/**
 * Find .env file by searching upwards from current directory
 * Stops at git repository root (where .git exists)
 * If not in a git repo, only checks current directory
 */
function findEnvFile(): string | null {
  let currentDir = process.cwd();
  const startDir = currentDir;
  let gitRootFound = false;

  // First, find if we're in a git repository and locate its root
  let searchDir = currentDir;
  while (searchDir !== path.parse(searchDir).root) {
    if (fs.existsSync(path.join(searchDir, '.git'))) {
      gitRootFound = true;
      break;
    }
    searchDir = path.dirname(searchDir);
  }

  // Now search for .env file
  while (currentDir !== path.parse(currentDir).root) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }

    // If we're in a git repo, stop at git root
    if (gitRootFound && fs.existsSync(path.join(currentDir, '.git'))) {
      break;
    }

    // If not in a git repo, only check the starting directory
    if (!gitRootFound && currentDir !== startDir) {
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

// Load environment variables from .env file
// Priority: 1) Explicitly set env vars, 2) .env file found by searching upwards
// The search stops at git repository root or current dir if not in a git repo
const envPath = findEnvFile();
if (envPath) {
  dotenvConfig({ path: envPath });
}

// Initialize WASM directory for embedded executables only
// For npm package mode, skip this and let parsers use default locations
if (hasEmbeddedWasmFiles()) {
  try {
    const wasmDir = extractWasmFiles();
    BaseParser.setWasmDirectory(wasmDir);
  } catch {
    // If extraction fails, parsers will fall back to other locations
  }
}

// Check for --version or -v flag
const args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
  console.log(`packmind-cli version ${CLI_VERSION}`);
  process.exit(0);
}

const app = subcommands({
  name: 'packmind-cli',
  description: 'Packmind CLI tool',
  cmds: {
    lint: lintCommand,
    pull: pullCommand,
  },
});

run(app, args).catch((error) => {
  console.error(chalk.bgRed.bold('packmind-cli'), chalk.red(error.message));
  process.exit(1);
});
