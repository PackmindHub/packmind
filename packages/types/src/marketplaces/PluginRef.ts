/**
 * Source coordinates telling a marketplace consumer how to fetch a plugin
 * entry's content. The marketplace format allows either a bare string path
 * relative to the marketplace root or one of several discriminated objects
 * (`github`, `url`, `git-subdir`, `npm`, `archive`, …).
 *
 * The type stays open (`source: string` plus an index signature) rather than a
 * closed discriminated union on purpose: this is third-party data Packmind only
 * reads and round-trips, never branches on. Modelling it exactly would make
 * every marketplace using a source kind Packmind has not been taught yet fail
 * to link. Packmind's own publish pipeline emits the narrow
 * {@link GitSubdirPluginSource}.
 */
export type PluginSourceObject = {
  source: string;
  [key: string]: unknown;
};

export type PluginSource = string | PluginSourceObject;

/**
 * The single source kind Packmind's publish pipeline emits: the plugin lives
 * in a subdirectory of the marketplace's own backing Git repo.
 */
export type GitSubdirPluginSource = {
  source: 'git-subdir';
  url: string;
  path: string;
};

/**
 * A single plugin entry declared inside a marketplace descriptor
 * (e.g. `marketplace.json`), in the vendor-agnostic shape the
 * `IMarketplaceDescriptorParser` implementations normalize vendor JSON into.
 *
 * Only the fields Packmind acts on are modelled here. Everything else a plugin
 * entry may carry (`author`, `category`, `keywords`, `hooks`, …) is preserved
 * on `MarketplaceDescriptor.raw` and merged back at serialization time, so an
 * unmanaged entry survives a Packmind publish unchanged.
 *
 * `source` is optional because parsers must tolerate legacy or unmanaged plugin
 * entries on disk that pre-date the Packmind-published `source` block.
 * Packmind-managed publishes always write it, so the disk state converges as
 * soon as a managed plugin is republished.
 */
export type PluginRef = {
  slug: string;
  name: string;
  version?: string;
  description?: string;
  source?: PluginSource;
};
