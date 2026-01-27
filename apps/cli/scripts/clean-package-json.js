#!/usr/bin/env node
/**
 * Post-build cleanup script:
 * 1. Remove backend-only dependencies from the generated package.json
 * 2. Add shebang to main.cjs for proper bin execution
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const distDir = path.join(__dirname, '../../../dist/apps/cli');
const packageJsonPath = path.join(distDir, 'package.json');
const mainCjsPath = path.join(distDir, 'main.cjs');

// 1. Clean package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Backend-only modules that should be removed
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

// Modules that are bundled into main.cjs and don't need to be installed
// cmd-ts and chalk are bundled to avoid ESM/CJS compatibility issues in Node 20
const bundledModules = ['cmd-ts', 'chalk'];

// Remove backend modules from dependencies
if (packageJson.dependencies) {
  backendModules.forEach((mod) => {
    if (packageJson.dependencies[mod]) {
      console.log(`Removing unused backend dependency: ${mod}`);
      delete packageJson.dependencies[mod];
    }
  });

  // Remove bundled modules from dependencies (they're included in main.cjs)
  bundledModules.forEach((mod) => {
    if (packageJson.dependencies[mod]) {
      console.log(`Removing bundled dependency: ${mod}`);
      delete packageJson.dependencies[mod];
    }
  });
}

// Remove overrides section if present (no longer needed since cmd-ts/chalk are bundled)
if (packageJson.overrides) {
  console.log('Removing overrides section (no longer needed)');
  delete packageJson.overrides;
}

// Ensure stub modules in node_modules are included in the package
// By default npm ignores node_modules, so we explicitly include it
if (!packageJson.files) {
  packageJson.files = [];
}
// Make sure node_modules is in the files list for stub modules
if (!packageJson.files.includes('node_modules')) {
  packageJson.files.push('node_modules');
}

// Write back the cleaned package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Cleaned package.json');

// 2. Add shebang to main.cjs
const mainContent = fs.readFileSync(mainCjsPath, 'utf8');
if (!mainContent.startsWith('#!')) {
  fs.writeFileSync(mainCjsPath, '#!/usr/bin/env node\n' + mainContent);
  console.log('✅ Added shebang to main.cjs');
} else {
  console.log('✅ Shebang already present in main.cjs');
}

// 3. Make main.cjs executable
fs.chmodSync(mainCjsPath, 0o755);
console.log('✅ Made main.cjs executable');
