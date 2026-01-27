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

  return {
    ...options,
    // Mark both web-tree-sitter AND backend modules as external
    // Stub modules will be created by create-stubs.js script
    external: ['web-tree-sitter', ...backendModules],
    platform: 'node',
    plugins: [...(options.plugins || [])],
  };
};
