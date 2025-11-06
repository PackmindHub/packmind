import fs from 'fs';
import path from 'path';

const BUNDLE_DIR = 'dist/packages/migrations-bundle';
const MIGRATIONS_DIR = path.join(
  BUNDLE_DIR,
  'packages/migrations/src/migrations',
);

function fixImports(filePath) {
  if (!filePath.endsWith('.js')) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace require("@packmind/shared/src/database/migrationColumns")
  content = content.replace(
    /require\("@packmind\/shared\/src\/database\/migrationColumns"\)/g,
    'require("../docker/migrationColumns")',
  );

  // Replace require("@packmind/shared") (for old logger references)
  content = content.replace(
    /require\("@packmind\/shared"\)/g,
    'require("../docker/DockerLogger")',
  );

  // Replace require("@packmind/logger") (NEW - for new logger package)
  content = content.replace(
    /require\("@packmind\/logger"\)/g,
    'require("../docker/DockerLogger")',
  );

  // Replace import_shared.PackmindLogger with import_shared.DockerLogger
  content = content.replace(
    /import_shared\.PackmindLogger/g,
    'import_shared.DockerLogger',
  );

  // Replace import_logger.PackmindLogger with import_logger.DockerLogger
  content = content.replace(
    /import_logger\.PackmindLogger/g,
    'import_logger.DockerLogger',
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
