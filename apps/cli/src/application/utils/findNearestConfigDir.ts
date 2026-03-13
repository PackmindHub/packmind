import * as path from 'path';
import { PackmindCliHexa } from '../../PackmindCliHexa';

/**
 * Walks up from startDir to find the nearest directory containing packmind.json.
 * Returns the directory path or null if not found.
 * Uses configExists (file existence check) rather than readFullConfig (file parsing)
 * so that callers retain full control over error handling for malformed configs.
 */
export async function findNearestConfigDir(
  startDir: string,
  packmindCliHexa: PackmindCliHexa,
): Promise<string | null> {
  let current = startDir;
  while (true) {
    const exists = await packmindCliHexa.configExists(current);
    if (exists) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null; // reached filesystem root
    }
    current = parent;
  }
}
