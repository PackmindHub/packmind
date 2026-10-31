import * as fs from 'fs';
import * as path from 'path';

/**
 * Find every .env file from startDir up to stopDir (inclusive), nearest first.
 * Stops at the filesystem root if stopDir is not an ancestor of startDir.
 */
export function findEnvFiles(startDir: string, stopDir: string): string[] {
  const envFiles: string[] = [];

  let searchDir = startDir;
  let parentDir = path.dirname(searchDir);

  // Loop naturally terminates at filesystem root since path.dirname('/') === '/'
  while (searchDir !== parentDir) {
    const envPath = path.join(searchDir, '.env');
    if (fs.existsSync(envPath)) {
      envFiles.push(envPath);
    }

    // Reached stop directory, stop after checking it
    if (searchDir === stopDir) {
      return envFiles;
    }

    searchDir = parentDir;
    parentDir = path.dirname(searchDir);
  }

  return envFiles;
}
