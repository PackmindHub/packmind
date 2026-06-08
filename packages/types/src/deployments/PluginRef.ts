/**
 * Source coordinates that tell a marketplace consumer (e.g. Claude Code)
 * how to fetch a plugin entry's content.
 *
 * Currently only the `git-subdir` shape is emitted by Packmind's publish
 * pipeline — the type discriminator is left as a string literal so other
 * vendor-specific source kinds (HTTP archive, registry, etc.) can be added
 * as a union later without touching call sites that already accept
 * `PluginSource`.
 */
export type PluginSource = {
  source: 'git-subdir';
  url: string;
  path: string;
};

/**
 * A single plugin entry declared inside a marketplace descriptor
 * (e.g. `marketplace.json`).
 *
 * Vendor-agnostic shape — concrete parsers in
 * `packages/deployments/.../parsers/` translate vendor-specific JSON into this
 * normalized form.
 *
 * `source` is optional on the type because parsers must tolerate legacy or
 * unmanaged plugin entries on disk that pre-date the Packmind-published
 * `source` block. Packmind-managed publishes always write a populated
 * `source` field through `applyPluginDescriptorMutation`, so the disk state
 * converges as soon as a managed plugin is republished.
 */
export type PluginRef = {
  slug: string;
  name: string;
  version?: string;
  description?: string;
  source?: PluginSource;
};
