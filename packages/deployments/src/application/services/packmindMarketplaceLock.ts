import {
  GitRepo,
  IGitPort,
  PACKMIND_MARKETPLACE_LOCK_FILENAME,
  PackmindMarketplaceLock,
  PackmindMarketplaceLockPluginEntry,
} from '@packmind/types';

/**
 * Path of the standalone Packmind marketplace lock file. The file always
 * sits at the marketplace repository root, regardless of where the vendor
 * descriptor (e.g. `marketplace.json`) lives.
 *
 * Re-export of `PACKMIND_MARKETPLACE_LOCK_FILENAME` so callers in the
 * deployments package can stay free of `@packmind/types` for this concern.
 */
export const PACKMIND_MARKETPLACE_LOCK_PATH =
  PACKMIND_MARKETPLACE_LOCK_FILENAME;

/**
 * Parses the raw text content of `packmind-lock.json` into a typed
 * `PackmindMarketplaceLock`.
 *
 * Throws a descriptive `Error` if the JSON is malformed, the top-level
 * shape is not an object, `schemaVersion` is not exactly `1`, or `plugins`
 * is not a record of properly shaped entries. The error message is
 * intentionally compact so the caller can surface it inside a
 * `MarketplaceDescriptorBadFormatError`.
 */
export function parsePackmindMarketplaceLock(
  content: string,
): PackmindMarketplaceLock {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`packmind-lock.json is not valid JSON: ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('packmind-lock.json must be a JSON object');
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate['schemaVersion'] !== 1) {
    throw new Error(
      `packmind-lock.json has unsupported schemaVersion: expected 1, got ${String(
        candidate['schemaVersion'],
      )}`,
    );
  }

  const pluginsRaw = candidate['plugins'];
  if (
    typeof pluginsRaw !== 'object' ||
    pluginsRaw === null ||
    Array.isArray(pluginsRaw)
  ) {
    throw new Error('packmind-lock.json must have a "plugins" object');
  }

  const plugins: Record<string, PackmindMarketplaceLockPluginEntry> = {};
  for (const [slug, entryRaw] of Object.entries(
    pluginsRaw as Record<string, unknown>,
  )) {
    if (typeof entryRaw !== 'object' || entryRaw === null) {
      throw new Error(
        `packmind-lock.json plugin entry "${slug}" must be an object`,
      );
    }
    const entry = entryRaw as Record<string, unknown>;
    if (typeof entry['version'] !== 'string') {
      throw new Error(
        `packmind-lock.json plugin entry "${slug}" is missing a "version" string`,
      );
    }
    if (typeof entry['contentHash'] !== 'string') {
      throw new Error(
        `packmind-lock.json plugin entry "${slug}" is missing a "contentHash" string`,
      );
    }
    if (typeof entry['lastPublishedAt'] !== 'string') {
      throw new Error(
        `packmind-lock.json plugin entry "${slug}" is missing a "lastPublishedAt" string`,
      );
    }
    if (typeof entry['lastPublishedBy'] !== 'string') {
      throw new Error(
        `packmind-lock.json plugin entry "${slug}" is missing a "lastPublishedBy" string`,
      );
    }
    plugins[slug] = {
      version: entry['version'],
      contentHash: entry['contentHash'],
      lastPublishedAt: entry['lastPublishedAt'],
      lastPublishedBy: entry[
        'lastPublishedBy'
      ] as PackmindMarketplaceLockPluginEntry['lastPublishedBy'],
    };
  }

  return {
    schemaVersion: 1,
    plugins,
  };
}

/**
 * Canonical JSON serialization of the Packmind marketplace lock — pretty
 * printed with two-space indent so the file is readable on the rolling-PR
 * diff.
 */
export function serializePackmindMarketplaceLock(
  lock: PackmindMarketplaceLock,
): string {
  return JSON.stringify(lock, null, 2);
}

/**
 * Empty lock instance — convenience constructor for the first-publish path
 * where no `packmind-lock.json` exists yet on the marketplace repo.
 */
export function emptyPackmindMarketplaceLock(): PackmindMarketplaceLock {
  return {
    schemaVersion: 1,
    plugins: {},
  };
}

/**
 * Fetches and parses the standalone `packmind-lock.json` file from the
 * marketplace repo at the given branch (defaults to the repo's default
 * branch when omitted).
 *
 * A `null` from `gitPort.getFileFromRepo` is treated as the first-publish
 * path — the function returns an empty lock so callers don't have to fork
 * their algorithm. Any other failure (transport error, malformed content)
 * propagates so the caller can surface it as
 * `MarketplaceDescriptorBadFormatError`.
 */
export async function fetchPackmindMarketplaceLock(
  gitPort: IGitPort,
  gitRepo: GitRepo,
  branch?: string,
): Promise<PackmindMarketplaceLock> {
  const file = await gitPort.getFileFromRepo(
    gitRepo,
    PACKMIND_MARKETPLACE_LOCK_PATH,
    branch,
  );
  if (!file) {
    return emptyPackmindMarketplaceLock();
  }
  return parsePackmindMarketplaceLock(file.content);
}
