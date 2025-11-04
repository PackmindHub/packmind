#!/usr/bin/env bun

/**
 * Custom Bun build script to handle unused dependencies
 * This replaces packages we don't need with empty modules
 *
 * Usage:
 *   bun run apps/cli/bun-build.ts                    # Build for current platform
 *   bun run apps/cli/bun-build.ts --target=linux     # Build for Linux (x64 and arm64)
 *   bun run apps/cli/bun-build.ts --target=macos     # Build for macOS (x64 and arm64)
 *   bun run apps/cli/bun-build.ts --target=windows   # Build for Windows (x64)
 *   bun run apps/cli/bun-build.ts --target=all       # Build for all platforms
 */

import { build } from 'bun';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_ENTRY = resolve(__dirname, 'src/main.ts');
const OUTPUT_DIR = resolve(__dirname, '../../dist/apps/cli-executables');
const STUB_MODULE = resolve(__dirname, 'scripts/class-validator.js');

// Available build targets
type BuildTarget = {
  target: string;
  outputName: string;
  os: string;
  arch: string;
};

const AVAILABLE_TARGETS: BuildTarget[] = [
  // Linux x64
  {
    target: 'bun-linux-x64',
    outputName: 'packmind-cli-linux-x64',
    os: 'linux',
    arch: 'x64',
  },
  {
    target: 'bun-linux-x64-baseline',
    outputName: 'packmind-cli-linux-x64-baseline',
    os: 'linux',
    arch: 'x64',
  },
  // Linux arm64
  {
    target: 'bun-linux-arm64',
    outputName: 'packmind-cli-linux-arm64',
    os: 'linux',
    arch: 'arm64',
  },
  // macOS x64
  {
    target: 'bun-darwin-x64',
    outputName: 'packmind-cli-macos-x64',
    os: 'darwin',
    arch: 'x64',
  },
  {
    target: 'bun-darwin-x64-baseline',
    outputName: 'packmind-cli-macos-x64-baseline',
    os: 'darwin',
    arch: 'x64',
  },
  // macOS arm64
  {
    target: 'bun-darwin-arm64',
    outputName: 'packmind-cli-macos-arm64',
    os: 'darwin',
    arch: 'arm64',
  },
  // Windows x64
  {
    target: 'bun-windows-x64',
    outputName: 'packmind-cli-windows-x64.exe',
    os: 'win32',
    arch: 'x64',
  },
  {
    target: 'bun-windows-x64-baseline',
    outputName: 'packmind-cli-windows-x64-baseline.exe',
    os: 'win32',
    arch: 'x64',
  },
];

// Parse command line arguments
const args = process.argv.slice(2);
const targetArg = args
  .find((arg) => arg.startsWith('--target='))
  ?.split('=')[1];

// Determine which targets to build
let targetsToBuild: BuildTarget[];

if (!targetArg) {
  // Build for current platform
  const os = process.platform;
  const arch = process.arch;
  targetsToBuild = AVAILABLE_TARGETS.filter(
    (t) => t.os === os && t.arch === arch && !t.target.includes('baseline'),
  );
  if (targetsToBuild.length === 0) {
    console.error(`❌ No target found for platform: ${os}-${arch}`);
    process.exit(1);
  }
} else if (targetArg === 'all') {
  // Build for all platforms (excluding baseline variants)
  targetsToBuild = AVAILABLE_TARGETS.filter(
    (t) => !t.target.includes('baseline'),
  );
} else if (targetArg === 'linux') {
  targetsToBuild = AVAILABLE_TARGETS.filter(
    (t) => t.os === 'linux' && !t.target.includes('baseline'),
  );
} else if (targetArg === 'macos' || targetArg === 'darwin') {
  targetsToBuild = AVAILABLE_TARGETS.filter(
    (t) => t.os === 'darwin' && !t.target.includes('baseline'),
  );
} else if (targetArg === 'windows') {
  targetsToBuild = AVAILABLE_TARGETS.filter(
    (t) => t.os === 'win32' && !t.target.includes('baseline'),
  );
} else {
  // Build specific target
  const found = AVAILABLE_TARGETS.find(
    (t) => t.target === targetArg || t.target === `bun-${targetArg}`,
  );
  if (!found) {
    console.error(`❌ Unknown target: ${targetArg}`);
    console.log('\nAvailable targets:');
    console.log('  - all (all platforms)');
    console.log('  - linux (Linux x64 + arm64)');
    console.log('  - macos/darwin (macOS x64 + arm64)');
    console.log('  - windows (Windows x64)');
    console.log('  Or specific targets:');
    AVAILABLE_TARGETS.forEach((t) => console.log(`  - ${t.target}`));
    process.exit(1);
  }
  targetsToBuild = [found];
}

// Create output directory
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Step 0: Embed WASM files before building
console.log('🔧 Embedding WASM files...');
const embedWasmScript = resolve(__dirname, 'scripts/embed-wasm-files.ts');
const embedResult = await Bun.spawn(['bun', 'run', embedWasmScript], {
  stdio: ['inherit', 'inherit', 'inherit'],
});
await embedResult.exited;

if (embedResult.exitCode !== 0) {
  console.error('❌ Failed to embed WASM files');
  process.exit(1);
}

console.log('\n🚀 Building Packmind CLI with Bun...');
console.log(`📦 Targets: ${targetsToBuild.map((t) => t.target).join(', ')}`);
console.log('');

async function buildForTarget(targetConfig: BuildTarget) {
  const { target, outputName } = targetConfig;

  console.log(`\n🎯 Building for ${target}...`);

  try {
    // Step 1: Bundle with aliases for stub modules
    console.log(`📦 Bundling...`);
    const result = await build({
      entrypoints: [CLI_ENTRY],
      outdir: OUTPUT_DIR,
      target: 'bun',
      format: 'esm',
      minify: false,
      splitting: false,
      sourcemap: 'none',
      alias: {
        'class-validator': STUB_MODULE,
        'class-transformer': STUB_MODULE,
        openai: STUB_MODULE,
        '@infisical/sdk': STUB_MODULE,
        ioredis: STUB_MODULE,
        typeorm: STUB_MODULE,
        nodemailer: STUB_MODULE,
      },
    });

    if (!result.success) {
      console.error(`❌ Bundle failed for ${target}:`, result.logs);
      return false;
    }

    const bundledFile = result.outputs[0].path;

    // Step 2: Compile the bundle to executable
    console.log(`🔨 Compiling to executable...`);
    const bunPath = process.argv[0];
    const compileResult = await Bun.spawn(
      [
        bunPath,
        'build',
        '--compile',
        '--minify',
        `--target=${target}`,
        bundledFile,
        `--outfile=${OUTPUT_DIR}/${outputName}`,
      ],
      {
        stdio: ['inherit', 'inherit', 'inherit'],
      },
    );

    await compileResult.exited;

    if (compileResult.exitCode !== 0) {
      console.error(`❌ Compilation failed for ${target}`);
      return false;
    }

    // Clean up intermediate files
    try {
      unlinkSync(bundledFile);
      const mapFile = bundledFile + '.map';
      if (existsSync(mapFile)) {
        unlinkSync(mapFile);
      }
    } catch {
      // Ignore cleanup errors
    }

    console.log(`✅ Built: ${OUTPUT_DIR}/${outputName}`);
    return true;
  } catch (error) {
    console.error(`❌ Build error for ${target}:`, error);
    return false;
  }
}

// Build all targets
const results: Array<{ target: string; success: boolean }> = [];

for (const targetConfig of targetsToBuild) {
  const success = await buildForTarget(targetConfig);
  results.push({ target: targetConfig.target, success });
}

// Summary
console.log('\n📊 Build Summary:');
results.forEach(({ target, success }) => {
  console.log(`  ${success ? '✅' : '❌'} ${target}`);
});

const allSuccess = results.every((r) => r.success);
if (allSuccess) {
  console.log('\n🎉 All builds completed successfully!');
  console.log('\n🧪 Test executables with:');
  targetsToBuild.forEach((t) => {
    console.log(`   ${OUTPUT_DIR}/${t.outputName} lint --help`);
  });
} else {
  console.log('\n⚠️  Some builds failed');
  process.exit(1);
}
