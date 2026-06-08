import {
  PackmindMarketplaceLock,
  PackmindMarketplaceLockPluginEntry,
  UserId,
} from '@packmind/types';

/**
 * Input to the lock mutator — the publish job builds one of these per
 * successful publish and asks the mutator to upsert the slug entry inside
 * the standalone `packmind-lock.json` file.
 */
export type PackmindMarketplaceLockMutationInput = {
  pluginSlug: string;
  pluginVersion: string;
  contentHash: string;
  lastPublishedAt: Date;
  lastPublishedBy: UserId;
};

/**
 * Pure mutator for the standalone Packmind marketplace lock file.
 *
 * Given a parsed `PackmindMarketplaceLock` and the metadata for one managed
 * plugin, returns a brand-new lock with an up-to-date entry under the
 * plugin slug (insert on first publish, refresh in place on subsequent
 * publishes). Entries for other slugs are preserved verbatim.
 *
 * The function is idempotent — calling it twice with the same input
 * produces the same lock. It does NOT mutate the input lock in place. The
 * returned lock is structurally suitable for serialization.
 */
export function applyPackmindMarketplaceLockMutation(
  lock: PackmindMarketplaceLock,
  params: PackmindMarketplaceLockMutationInput,
): PackmindMarketplaceLock {
  const entry: PackmindMarketplaceLockPluginEntry = {
    version: params.pluginVersion,
    contentHash: params.contentHash,
    lastPublishedAt: params.lastPublishedAt.toISOString(),
    lastPublishedBy: params.lastPublishedBy,
  };

  return {
    schemaVersion: 1,
    plugins: {
      ...lock.plugins,
      [params.pluginSlug]: entry,
    },
  };
}

/**
 * Pure mutator that removes a plugin entry from the standalone lock. Used
 * by the remove-plugin job to keep the lock in sync with the descriptor
 * when retiring a managed plugin.
 *
 * Idempotent — removing a slug that is already absent returns a
 * structurally equivalent lock. Does NOT mutate the input lock in place.
 */
export function removePackmindMarketplaceLockEntry(
  lock: PackmindMarketplaceLock,
  pluginSlug: string,
): PackmindMarketplaceLock {
  const plugins = Object.fromEntries(
    Object.entries(lock.plugins).filter(([slug]) => slug !== pluginSlug),
  );
  return {
    schemaVersion: 1,
    plugins,
  };
}
