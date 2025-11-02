#!/usr/bin/env node
/**
 * Creates stub modules for backend dependencies that aren't needed by the CLI
 * This allows the CLI to be published without heavy backend dependencies
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', '..', '..', 'dist', 'apps', 'cli');
// Put stubs in a special directory called 'stubs' instead of 'node_modules'
// npm refuses to package anything in node_modules
const nodeModulesDir = path.join(distDir, 'stubs');

// Backend modules that need to be stubbed
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

// Create node_modules directory if it doesn't exist
if (!fs.existsSync(nodeModulesDir)) {
  fs.mkdirSync(nodeModulesDir, { recursive: true });
}

// Create stub for each backend module
backendModules.forEach((moduleName) => {
  const parts = moduleName.split('/');
  let moduleDir;

  if (moduleName.startsWith('@')) {
    // Scoped package like @nestjs/common
    const scope = parts[0];
    const name = parts[1];
    const scopeDir = path.join(nodeModulesDir, scope);
    moduleDir = path.join(scopeDir, name);

    if (!fs.existsSync(scopeDir)) {
      fs.mkdirSync(scopeDir, { recursive: true });
    }
  } else {
    // Regular package
    moduleDir = path.join(nodeModulesDir, moduleName);
  }

  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
  }

  // Create a stub index.js that exports safe defaults
  const stubContent = `
// Stub module for ${moduleName}
// This module is not actually used by the CLI but is imported by shared dependencies

const stub = function(...args) {
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'then' || prop === 'catch') {
        return undefined;
      }
      return stub;
    },
    apply: () => stub,
  });
};

// Provide both CommonJS and ES module exports
stub.default = stub;
module.exports = stub;
module.exports.default = stub;
`;

  fs.writeFileSync(path.join(moduleDir, 'index.js'), stubContent.trim());

  // Create a minimal package.json
  const packageJson = {
    name: moduleName,
    version: '0.0.0-stub',
    description: `Stub for ${moduleName} - not actually used by CLI`,
    main: 'index.js',
  };

  fs.writeFileSync(
    path.join(moduleDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  console.log(`Created stub for ${moduleName}`);
});

console.log(`\nSuccessfully created ${backendModules.length} stub modules`);
