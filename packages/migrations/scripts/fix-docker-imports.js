import fs from 'fs';
import path from 'path';

const BUNDLE_DIR = 'dist/packages/migrations-bundle';
const MIGRATIONS_DIR = path.join(
  BUNDLE_DIR,
  'packages/migrations/src/migrations',
);

function fixImports(filePath) {
  if (!filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace @packmind/node-utils imports
  content = content.replace(
    /from '@packmind\/node-utils'/g,
    "from '../docker/migrationColumns'",
  );

  // Replace @packmind/shared imports (for old logger references)
  content = content.replace(
    /from '@packmind\/logger'/g,
    "from '../docker/DockerLogger'",
  );

  // Replace @packmind/logger imports (NEW - for new logger package)
  content = content.replace(
    /from '@packmind\/logger'/g,
    "from '../docker/DockerLogger'",
  );

  // Replace PackmindLogger class name with DockerLogger
  content = content.replace(/PackmindLogger/g, 'DockerLogger');

  fs.writeFileSync(filePath, content);
}

if (fs.existsSync(MIGRATIONS_DIR)) {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  files.forEach((file) => fixImports(path.join(MIGRATIONS_DIR, file)));
  console.log('✅ Fixed imports in', files.length, 'migration files');
} else {
  console.error('❌ Migrations directory not found:', MIGRATIONS_DIR);
  process.exit(1);
}
