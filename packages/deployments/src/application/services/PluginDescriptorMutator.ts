import { MarketplaceDescriptor, PluginRef } from '@packmind/types';

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
};

/**
 * Pure descriptor mutator used by the marketplace publish pipeline.
 *
 * Given a parsed `MarketplaceDescriptor` and the metadata for one managed
 * plugin, returns a brand-new descriptor with `descriptor.plugins[]`
 * containing an up-to-date entry for the plugin slug (insert on first
 * publish, refresh in place on subsequent publishes).
 *
 * The standalone `packmind-lock.json` is mutated by a separate concern
 * (`applyPackmindMarketplaceLockMutation`) — the descriptor mutator stays
 * focused on the vendor file and does not touch any Packmind metadata.
 *
 * The function is idempotent — calling it twice with the same input
 * produces the same descriptor. Unmanaged plugin entries are left
 * untouched.
 *
 * The function does **not** mutate the input descriptor in place. The
 * returned descriptor is a structural copy suitable for serialization.
 */
export function applyPluginDescriptorMutation(
  descriptor: MarketplaceDescriptor,
  mutation: PluginDescriptorMutationInput,
): MarketplaceDescriptor {
  const { pluginSlug, pluginName, pluginVersion } = mutation;

  const refreshedPlugins = upsertPluginRef(descriptor.plugins, {
    slug: pluginSlug,
    name: pluginName,
    ...(pluginVersion !== undefined ? { version: pluginVersion } : {}),
  });

  return {
    ...descriptor,
    plugins: refreshedPlugins,
  };
}

/**
 * Pure descriptor mutator used by the marketplace removal pipeline — the
 * inverse of {@link applyPluginDescriptorMutation}.
 *
 * Given a parsed `MarketplaceDescriptor` and a plugin slug, returns a
 * brand-new descriptor with the matching entry dropped from
 * `descriptor.plugins[]`.
 *
 * Idempotent — removing a slug that is already absent returns a structurally
 * equivalent descriptor. Unmanaged plugin entries are left untouched. Does
 * **not** mutate the input descriptor in place.
 */
export function removePluginDescriptorEntry(
  descriptor: MarketplaceDescriptor,
  pluginSlug: string,
): MarketplaceDescriptor {
  const refreshedPlugins = descriptor.plugins.filter(
    (p) => p.slug !== pluginSlug,
  );

  return {
    ...descriptor,
    plugins: refreshedPlugins,
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
