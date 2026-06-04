import {
  MarketplaceDescriptor,
  MarketplaceDescriptorPackmindLock,
  MarketplaceDescriptorPackmindLockEntry,
  PluginRef,
  UserId,
} from '@packmind/types';

/**
 * Plugin metadata supplied by the publish job when it asks the mutator to
 * add or refresh a Packmind-managed plugin entry inside the marketplace
 * descriptor.
 */
export type PluginDescriptorMutationInput = {
  /** Slug used as the canonical identifier inside `descriptor.plugins[]`. */
  pluginSlug: string;
  /** Human-readable name displayed by marketplace consumers. */
  pluginName: string;
  /** Optional plugin version surfaced on `PluginRef.version`. */
  pluginVersion?: string;
  /** Lock state Packmind writes back to `descriptor.packmindLock.plugins`. */
  lockEntry: MarketplaceDescriptorPackmindLockEntry;
};

/**
 * Pure descriptor mutator used by the marketplace publish pipeline.
 *
 * Given a parsed `MarketplaceDescriptor` and the metadata for one managed
 * plugin, returns a brand-new descriptor with:
 *   1. `descriptor.plugins[]` containing an up-to-date entry for the
 *      plugin slug (insert on first publish, refresh in place on
 *      subsequent publishes).
 *   2. `descriptor.packmindLock.plugins[slug]` carrying the lock entry.
 *
 * The function is idempotent — calling it twice with the same input
 * produces the same descriptor. Unmanaged plugin entries (those not
 * present in `packmindLock.plugins`) are left untouched.
 *
 * The function does **not** mutate the input descriptor in place. The
 * returned descriptor is a structural copy suitable for serialization.
 */
export function applyPluginDescriptorMutation(
  descriptor: MarketplaceDescriptor,
  mutation: PluginDescriptorMutationInput,
): MarketplaceDescriptor {
  const { pluginSlug, pluginName, pluginVersion, lockEntry } = mutation;

  const refreshedPlugins = upsertPluginRef(descriptor.plugins, {
    slug: pluginSlug,
    name: pluginName,
    ...(pluginVersion !== undefined ? { version: pluginVersion } : {}),
  });

  const refreshedLock = upsertPackmindLockEntry(
    descriptor.packmindLock,
    pluginSlug,
    lockEntry,
  );

  return {
    ...descriptor,
    plugins: refreshedPlugins,
    packmindLock: refreshedLock,
  };
}

/**
 * Pure descriptor mutator used by the marketplace removal pipeline — the
 * inverse of {@link applyPluginDescriptorMutation}.
 *
 * Given a parsed `MarketplaceDescriptor` and a plugin slug, returns a
 * brand-new descriptor with:
 *   1. the matching entry dropped from `descriptor.plugins[]`, and
 *   2. the matching entry dropped from `descriptor.packmindLock.plugins`.
 *
 * Idempotent — removing a slug that is already absent returns a structurally
 * equivalent descriptor. Unmanaged plugin entries and the rest of the lock
 * are left untouched. Does **not** mutate the input descriptor in place.
 */
export function removePluginDescriptorEntry(
  descriptor: MarketplaceDescriptor,
  pluginSlug: string,
): MarketplaceDescriptor {
  const refreshedPlugins = descriptor.plugins.filter(
    (p) => p.slug !== pluginSlug,
  );

  const refreshedLock = removePackmindLockEntry(
    descriptor.packmindLock,
    pluginSlug,
  );

  return {
    ...descriptor,
    plugins: refreshedPlugins,
    ...(refreshedLock ? { packmindLock: refreshedLock } : {}),
  };
}

function removePackmindLockEntry(
  current: MarketplaceDescriptorPackmindLock | undefined,
  pluginSlug: string,
): MarketplaceDescriptorPackmindLock | undefined {
  if (!current) {
    return undefined;
  }
  const plugins = Object.fromEntries(
    Object.entries(current.plugins).filter(([slug]) => slug !== pluginSlug),
  );
  return {
    schemaVersion: 1,
    plugins,
  };
}

function upsertPluginRef(current: PluginRef[], next: PluginRef): PluginRef[] {
  const existingIndex = current.findIndex((p) => p.slug === next.slug);
  if (existingIndex === -1) {
    return [...current, next];
  }
  const copy = [...current];
  copy[existingIndex] = next;
  return copy;
}

function upsertPackmindLockEntry(
  current: MarketplaceDescriptorPackmindLock | undefined,
  pluginSlug: string,
  entry: MarketplaceDescriptorPackmindLockEntry,
): MarketplaceDescriptorPackmindLock {
  const base: MarketplaceDescriptorPackmindLock = current
    ? {
        schemaVersion: 1,
        plugins: { ...current.plugins },
      }
    : {
        schemaVersion: 1,
        plugins: {},
      };

  base.plugins[pluginSlug] = entry;
  return base;
}

/**
 * Helper for callers that need a freshly-stamped lock entry. Centralized so
 * the publish job and tests agree on the lock shape.
 */
export function buildPluginLockEntry(params: {
  pluginVersion: string;
  contentHash: string;
  lastPublishedAt: Date;
  lastPublishedBy: UserId;
}): MarketplaceDescriptorPackmindLockEntry {
  return {
    version: params.pluginVersion,
    contentHash: params.contentHash,
    lastPublishedAt: params.lastPublishedAt.toISOString(),
    lastPublishedBy: params.lastPublishedBy,
  };
}
