import { run, subcommands } from 'cmd-ts';
import { lintCommand } from './infra/commands/LinterCommand';
import { BaseParser } from '@packmind/linter-ast';
import { extractWasmFiles, hasEmbeddedWasmFiles } from './wasm-runtime';
import { config as dotenvConfig } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { installCommand } from './infra/commands/InstallCommand';
import { uninstallCommand } from './infra/commands/UninstallCommand';
import { loginCommand } from './infra/commands/LoginCommand';
import { logoutCommand } from './infra/commands/LogoutCommand';
import { whoamiCommand } from './infra/commands/WhoamiCommand';
import { setupMcpCommand } from './infra/commands/SetupMcpCommand';
import { skillsCommand } from './infra/commands/SkillsCommand';
import { standardsCommand } from './infra/commands/StandardsCommand';
import { commandsCommand } from './infra/commands/CommandsCommand';
import { packagesCommand } from './infra/commands/PackagesCommand';
import { GitService } from './application/services/GitService';
import { logConsole, logErrorConsole } from './infra/utils/consoleLogger';

// Read version from package.json (bundled by esbuild)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../package.json');

/**
 * Find .env file by searching upwards from current directory
 * Stops at git repository root if in a git repo
 * Searches up to filesystem root if not in a git repo
 */
function findEnvFile(): string | null {
  const currentDir = process.cwd();
  const gitService = new GitService();
  const gitRoot = gitService.getGitRepositoryRootSync(currentDir);

  // Determine stop directory: git root if in a repo, otherwise filesystem root
  const filesystemRoot = path.parse(currentDir).root;
  const stopDir = gitRoot ?? filesystemRoot;

  let searchDir = currentDir;
  let parentDir = path.dirname(searchDir);

  // Search until we've checked the stop directory
  // Loop naturally terminates at filesystem root since path.dirname('/') === '/'
  while (searchDir !== parentDir) {
    const envPath = path.join(searchDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }

    // Reached stop directory, stop after checking it
    if (searchDir === stopDir) {
      return null;
    }

    searchDir = parentDir;
    parentDir = path.dirname(searchDir);
  }

  return null;
}

// Load environment variables from .env file
// Priority: 1) Explicitly set env vars, 2) .env file found by searching upwards
// The search stops at git repository root if in a git repo, or filesystem root otherwise
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
  logConsole(`packmind-cli version ${CLI_VERSION}`);
  process.exit(0);
}

const app = subcommands({
  name: 'packmind-cli',
  description: 'Packmind CLI tool',
  cmds: {
    lint: lintCommand,
    install: installCommand,
    uninstall: uninstallCommand,
    remove: uninstallCommand, // Alias for uninstall
    login: loginCommand,
    logout: logoutCommand,
    whoami: whoamiCommand,
    'setup-mcp': setupMcpCommand,
    skills: skillsCommand,
    standards: standardsCommand,
    commands: commandsCommand,
    packages: packagesCommand,
  },
});

run(app, args).catch((error) => {
  logErrorConsole(error.message);
  process.exit(1);
});
