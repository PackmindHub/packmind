import fs from 'fs';
import path from 'path';

/**
 * Reads a file from the test directory.
 *
 * @param filePath - Relative path to the file from the test directory
 * @param testDir - Test directory path
 * @returns File contents as string
 */
export async function readFile(
  filePath: string,
  testDir: string,
): Promise<string> {
  const fullPath = path.join(testDir, filePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Writes content to a file in the test directory.
 * Creates parent directories if they don't exist.
 *
 * @param filePath - Relative path to the file from the test directory
 * @param content - Content to write
 * @param testDir - Test directory path
 */
export async function updateFile(
  filePath: string,
  content: string,
  testDir: string,
): Promise<void> {
  const fullPath = path.join(testDir, filePath);
  const dir = path.dirname(fullPath);

  // Create parent directories if they don't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Checks if a file exists in the test directory.
 *
 * @param filePath - Relative path to the file from the test directory
 * @param testDir - Test directory path
 * @returns true if file exists, false otherwise
 */
export function fileExists(filePath: string, testDir: string): boolean {
  const fullPath = path.join(testDir, filePath);
  return fs.existsSync(fullPath);
}
