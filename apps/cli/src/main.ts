import chalk from 'chalk';
import { run, subcommands } from 'cmd-ts';
import { lintCommand } from './infra/commands/LinterCommand';
import { BaseParser } from '@packmind/linter-ast';
import { extractWasmFiles, hasEmbeddedWasmFiles } from './wasm-runtime';

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

const app = subcommands({
  name: 'packmind-cli',
  description: 'Packmind CLI tool',
  cmds: {
    lint: lintCommand,
  },
});

run(app, process.argv.slice(2)).catch((error) => {
  console.error(chalk.bgRed.bold('packmind-cli'), chalk.red(error.message));
  process.exit(1);
});
