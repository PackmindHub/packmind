#!/usr/bin/env node
/**
 * Prepends stub module resolution to the built CLI
 * This allows the CLI to find stub modules in the 'stubs' directory
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', '..', '..', 'dist', 'apps', 'cli');
const mainCjsPath = path.join(distDir, 'main.cjs');

// Code to prepend that adds stubs directory to module resolution paths
const modulePathSetup = `
// Add stubs directory to module resolution paths
// This allows Node.js to find our stub modules
const __stubsPath = require('path');
const __stubsDir = __stubsPath.join(__dirname, 'stubs');
if (!module.paths.includes(__stubsDir)) {
  module.paths.unshift(__stubsDir);
}

`.trim();

// Read current content
let content = fs.readFileSync(mainCjsPath, 'utf8');

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

  fs.writeFileSync(mainCjsPath, content);
  console.log('✅ Added module path setup to main.cjs');
} else {
  console.log('✅ Module path setup already present');
}
