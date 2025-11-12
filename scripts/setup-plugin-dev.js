#!/usr/bin/env node

/**
 * Script to set up a plugin repository for development with Packmind.
 *
 * This script:
 * 1. Ensures core packages are built
 * 2. Sets up core dependencies in the plugin repo (runs setup-core-deps)
 * 3. Copies the plugin repository to plugins/ directory
 *
 * Usage:
 *   npm run setup-plugin-dev /path/to/plugin/repository
 *
 * Environment variables:
 *   PACKMIND_PLUGINS_DIR - Override default plugin directory (default: plugins/)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PLUGINS_DIR = process.env.PACKMIND_PLUGINS_DIR
  ? path.resolve(process.env.PACKMIND_PLUGINS_DIR)
  : path.join(PLUGIN_ROOT, 'plugins');

function log(message) {
  console.log(`[setup-plugin-dev] ${message}`);
}

function error(message) {
  console.error(`[setup-plugin-dev] ERROR: ${message}`);
  process.exit(1);
}

function getPluginName(pluginRepoPath) {
  // Try to read from manifest.json first
  const manifestPath = path.join(pluginRepoPath, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (manifest.id) return manifest.id;
      if (manifest.name) return manifest.name;
    } catch {
      // Fall through to package.json
    }
  }

  // Fall back to package.json
  const packageJsonPath = path.join(pluginRepoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return pkg.name || path.basename(pluginRepoPath);
    } catch {
      // Fall through to directory name
    }
  }

  // Last resort: use directory name
  return path.basename(pluginRepoPath);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    // Skip node_modules, .git, and other common directories
    // BUT keep 'dist' as it contains the built bundles we need
    const basename = path.basename(src);
    if (['node_modules', '.git', '.nx', 'tmp', 'coverage'].includes(basename)) {
      return;
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    // Skip certain files
    const basename = path.basename(src);
    if (basename.startsWith('.') && basename !== '.gitignore') {
      return;
    }
    fs.copyFileSync(src, dest);
  }
}

function checkCorePackages() {
  log('Checking core packages...');

  const corePackages = ['node-utils', 'types', 'logger', 'ui'];
  const missingPackages = [];

  for (const pkg of corePackages) {
    const distPath = path.join(
      PLUGIN_ROOT,
      'dist',
      'packages',
      pkg === 'ui' ? 'packmind-ui' : pkg,
    );
    if (!fs.existsSync(distPath)) {
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    log(`Building missing core packages: ${missingPackages.join(', ')}...`);
    try {
      for (const pkg of missingPackages) {
        log(`Building ${pkg}...`);
        execSync(`nx build ${pkg}`, {
          cwd: PLUGIN_ROOT,
          stdio: 'inherit',
        });
      }
      log('✓ Core packages built');
    } catch (err) {
      error(`Failed to build core packages: ${err.message}`);
    }
  } else {
    log('✓ All core packages are built');
  }
}

function setupCoreDeps(pluginRepoPath) {
  log('Setting up core dependencies in plugin repository...');

  const setupScriptPath = path.join(
    pluginRepoPath,
    'scripts',
    'setup-core-deps.js',
  );

  if (!fs.existsSync(setupScriptPath)) {
    log(
      '⚠ setup-core-deps.js not found in plugin repo, skipping core-deps setup',
    );
    log(
      '  Make sure to run "npm run setup-core-deps" manually in the plugin repo',
    );
    return;
  }

  try {
    // Set PACKMIND_MAIN_REPO environment variable so the script knows where the main repo is
    const env = {
      ...process.env,
      PACKMIND_MAIN_REPO: PLUGIN_ROOT,
    };

    execSync('node scripts/setup-core-deps.js', {
      cwd: pluginRepoPath,
      env,
      stdio: 'inherit',
    });

    log('✓ Core dependencies set up in plugin repository');
  } catch (err) {
    error(`Failed to set up core dependencies: ${err.message}`);
  }
}

function copyPlugin(pluginRepoPath, pluginName) {
  const targetPath = path.join(PLUGINS_DIR, pluginName);

  log(`Copying plugin from ${pluginRepoPath} to ${targetPath}...`);

  // Remove existing copy
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  // Create plugins directory if it doesn't exist
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  }

  // Copy plugin files
  copyRecursiveSync(pluginRepoPath, targetPath);

  log(`✓ Plugin copied to ${targetPath}`);
}

function startWatch(pluginRepoPath, pluginName) {
  log('');
  log('Starting file watcher...');
  log('Press Ctrl+C to stop watching');

  // Use chokidar-cli or similar for cross-platform file watching
  // For now, we'll use a simple approach with fs.watch or recommend a tool
  log('');
  log('To watch for changes, you can:');
  log('1. Run this script again after making changes');
  log('2. Use a file watcher like chokidar-cli:');
  log(
    `   npx chokidar "${pluginRepoPath}/**/*" -c "npm run setup-plugin-dev ${pluginRepoPath}" --ignore "${pluginRepoPath}/node_modules/**" --ignore "${pluginRepoPath}/.git/**"`,
  );
  log('');
  log('Or manually run this script again after building your plugin.');
}

function main() {
  const pluginRepoPath = process.argv[2];

  if (!pluginRepoPath) {
    error('Please provide the path to the plugin repository');
    error('Usage: npm run setup-plugin-dev /path/to/plugin/repository');
    process.exit(1);
  }

  const resolvedPluginPath = path.resolve(pluginRepoPath);

  if (!fs.existsSync(resolvedPluginPath)) {
    error(`Plugin repository not found: ${resolvedPluginPath}`);
  }

  if (!fs.statSync(resolvedPluginPath).isDirectory()) {
    error(`Path is not a directory: ${resolvedPluginPath}`);
  }

  log('Setting up plugin for development...');
  log(`Plugin repository: ${resolvedPluginPath}`);
  log(`Plugins directory: ${PLUGINS_DIR}`);
  log('');

  // Step 1: Check and build core packages if needed
  checkCorePackages();
  log('');

  // Step 2: Set up core dependencies in plugin repo
  setupCoreDeps(resolvedPluginPath);
  log('');

  // Step 3: Copy plugin to plugins directory
  const pluginName = getPluginName(resolvedPluginPath);
  log(`Plugin name: ${pluginName}`);
  copyPlugin(resolvedPluginPath, pluginName);

  log('');
  log('✓ Plugin setup complete!');
  log('');
  log('Next steps:');
  log('1. Build your plugin: cd <plugin-repo> && npm run build');
  log('2. The plugin will be loaded automatically from plugins/');
  log('3. Re-run this script after making changes to copy updates');

  // Optionally start watch mode
  if (process.argv.includes('--watch')) {
    startWatch(resolvedPluginPath, pluginName);
  }
}

main();
