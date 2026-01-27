/**
 * esbuild configuration for publishing the CLI to npm
 * Marks backend dependencies as external - stubs will be provided at runtime
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { builtinModules } = require('module');

module.exports = (options) => {
  // Backend-only modules that the CLI doesn't use but get imported by @packmind/shared
  const backendModules = [
    'ioredis',
    'typeorm',
    'openai',
    '@infisical/sdk',
    'nodemailer',
    '@nestjs/common',
    'rxjs',
    'reflect-metadata',
    '@types/nodemailer',
  ];

  // Node.js built-in modules need to be external for ESM compatibility
  // Some CJS dependencies (like debug) use dynamic require for these
  const nodeBuiltins = builtinModules.flatMap((m) => [m, `node:${m}`]);

  // Banner to provide require() function for ESM output
  // This is needed for any remaining dynamic requires
  const esmBanner = `
import { createRequire as __createRequire } from 'module';
import { fileURLToPath as __fileURLToPath } from 'url';
import { dirname as __dirname_fn } from 'path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_fn(__filename);
`.trim();

  return {
    ...options,
    // Mark web-tree-sitter, backend modules, and Node.js built-ins as external
    // Node.js built-ins are external to avoid dynamic require issues in ESM
    // Stub modules will be created by create-stubs.js script for backend modules
    external: ['web-tree-sitter', ...backendModules, ...nodeBuiltins],
    platform: 'node',
    banner: {
      js: esmBanner,
    },
    plugins: [...(options.plugins || [])],
  };
};
