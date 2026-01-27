/**
 * esbuild configuration for publishing the CLI to npm
 * Marks backend dependencies as external - stubs will be provided at runtime
 */

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

  // Banner to provide require() function for ESM output
  // This is needed because some CJS dependencies (like debug) use dynamic require
  // for Node.js built-in modules (tty, fs, etc.)
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
    // Mark both web-tree-sitter AND backend modules as external
    // Stub modules will be created by create-stubs.js script
    external: ['web-tree-sitter', ...backendModules],
    platform: 'node',
    banner: {
      js: esmBanner,
    },
    plugins: [...(options.plugins || [])],
  };
};
