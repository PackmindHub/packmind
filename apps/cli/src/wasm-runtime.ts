/**
 * WASM Runtime Manager
 * Handles extraction and management of embedded WASM files at runtime
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { EMBEDDED_WASM_FILES } from './embedded-wasm';

let wasmExtractedDir: string | null = null;

/**
 * Check if there are any embedded WASM files
 * Returns false for npm package builds, true for executables with embedded files
 */
export function hasEmbeddedWasmFiles(): boolean {
  return Object.keys(EMBEDDED_WASM_FILES).length > 0;
}

/**
 * Extracts embedded WASM files to a temporary directory
 * Returns the directory path where WASM files are extracted
 */
export function extractWasmFiles(): string {
  if (wasmExtractedDir && existsSync(wasmExtractedDir)) {
    return wasmExtractedDir;
  }

  // Create a unique temporary directory for this process
  const tempDir = join(tmpdir(), `packmind-wasm-${process.pid}`);

  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  // Extract all WASM files
  for (const [filename, base64Data] of Object.entries(EMBEDDED_WASM_FILES)) {
    const wasmPath = join(tempDir, filename);

    // Skip if already extracted
    if (existsSync(wasmPath)) {
      continue;
    }

    const wasmBuffer = Buffer.from(base64Data as string, 'base64');
    writeFileSync(wasmPath, wasmBuffer);
  }

  wasmExtractedDir = tempDir;

  // Clean up on exit
  process.on('exit', () => {
    // Note: We don't delete files on exit to allow faster startup on subsequent runs
    // The OS will clean up /tmp periodically
  });

  return tempDir;
}

/**
 * Gets the directory where WASM files are located
 * Call this before initializing parsers
 */
export function getWasmDirectory(): string {
  if (!wasmExtractedDir) {
    return extractWasmFiles();
  }
  return wasmExtractedDir;
}
