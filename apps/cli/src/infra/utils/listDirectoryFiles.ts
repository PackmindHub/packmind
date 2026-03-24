import { readdirSync } from 'fs';
import * as path from 'path';

/**
 * Recursively lists all files in a directory, returning their paths
 * relative to the given directory.
 */
export function listDirectoryFiles(dirPath: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      for (const nested of listDirectoryFiles(fullPath)) {
        results.push(path.join(entry.name, nested));
      }
    } else if (entry.isFile()) {
      results.push(entry.name);
    }
  }
  return results;
}
