#!/usr/bin/env node
/**
 * Prepends stub module resolution to the built CLI (ESM version)
 * This allows the CLI to find stub modules in the 'stubs' directory
 * For ESM, we use NODE_PATH environment variable with self-relaunching
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', '..', '..', 'dist', 'apps', 'cli');
const mainJsPath = path.join(distDir, 'main.js');

// Code to prepend that adds stubs directory to module resolution paths (ESM version)
// This code checks if NODE_PATH includes the stubs directory, and if not,
// re-launches the script with NODE_PATH set appropriately
const modulePathSetup = `
// Add stubs directory to module resolution paths (ESM version)
// This allows Node.js to find our stub modules for backend dependencies
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __stubsDir = join(__dirname, 'stubs');

// Check if we need to relaunch with NODE_PATH set
if (!process.env.__PACKMIND_STUBS_LOADED) {
  const nodePath = process.env.NODE_PATH ? \`\${process.env.NODE_PATH}\${process.platform === 'win32' ? ';' : ':'}\${__stubsDir}\` : __stubsDir;
  const child = spawn(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: nodePath, __PACKMIND_STUBS_LOADED: '1' }
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  // Prevent the rest of the script from executing in the parent process
  await new Promise(() => {}); // Never resolves, keeps parent alive until child exits
}

`.trim();

// Read current content
let content = fs.readFileSync(mainJsPath, 'utf8');

// Check if already has setup
if (!content.includes('Add stubs directory')) {
  // Find where to insert (after shebang if present)
  const lines = content.split('\n');
  let insertIndex = 0;

  if (lines[0].startsWith('#!')) {
    insertIndex = 1;
  }

  lines.splice(insertIndex, 0, modulePathSetup);
  content = lines.join('\n');

  fs.writeFileSync(mainJsPath, content);
  console.log('✅ Added module path setup to main.js');
} else {
  console.log('✅ Module path setup already present');
}
