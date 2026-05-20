import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import semver from 'semver';
import {
  IVersionCacheEntry,
  IVersionCacheProvider,
} from '../../../domain/repositories/IVersionCacheProvider';

const CACHE_DIR = '.packmind';
const CACHE_FILE = 'version-check.json';

interface StoredCacheEntry {
  latestVersion: string;
  checkedAt: string;
}

function getCachePath(): string {
  return path.join(os.homedir(), CACHE_DIR, CACHE_FILE);
}

export class FileVersionCacheProvider implements IVersionCacheProvider {
  read(): IVersionCacheEntry | null {
    const cachePath = getCachePath();
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      const stored = JSON.parse(content) as StoredCacheEntry;

      if (!stored.latestVersion || !stored.checkedAt) {
        return null;
      }

      if (!semver.valid(stored.latestVersion)) {
        return null;
      }

      const checkedAt = new Date(stored.checkedAt);
      if (Number.isNaN(checkedAt.getTime())) {
        return null;
      }

      return {
        latestVersion: stored.latestVersion,
        checkedAt,
      };
    } catch {
      return null;
    }
  }

  write(entry: IVersionCacheEntry): void {
    const cacheDir = path.join(os.homedir(), CACHE_DIR);

    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
      }

      const stored: StoredCacheEntry = {
        latestVersion: entry.latestVersion,
        checkedAt: entry.checkedAt.toISOString(),
      };

      const cachePath = getCachePath();
      const tmpPath = `${cachePath}.${process.pid}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(stored, null, 2), {
        mode: 0o600,
      });
      fs.renameSync(tmpPath, cachePath);
    } catch {
      // Cache write is best-effort — failure should never break the CLI.
    }
  }
}
