/**
 * Source coordinates that tell a marketplace consumer (e.g. Claude Code)
 * how to fetch a plugin entry's content.
 *
 * The Anthropic marketplace format accepts either a bare string — a path
 * relative to the marketplace root, e.g. `"./plugins/formatter"` — or a
 * discriminated object. The object kinds and their own fields are:
 *
 *   - `github`      → `repo`, `ref?`, `sha?`
 *   - `url`         → `url`, `ref?`, `sha?`
 *   - `git-subdir`  → `url`, `path`, `ref?`, `sha?`
 *   - `npm`         → `package`, `version?`, `registry?`
 *   - `archive`     → `url`, `sha256?`
 *
 * The type stays open (`source: string` plus an index signature) rather than a
 * closed discriminated union on purpose: this is third-party data Packmind
 * only reads and round-trips, never branches on. Modelling it exactly would
 * make every marketplace using a source kind Packmind has not been taught yet
 * fail to link, which is precisely the failure this shape avoids. Packmind's
 * own publish pipeline emits the narrow {@link GitSubdirPluginSource}.
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
 * (e.g. `marketplace.json`).
 *
 * Vendor-agnostic shape — concrete parsers in
 * `packages/deployments/.../parsers/` translate vendor-specific JSON into this
 * normalized form.
 *
 * Only the fields Packmind acts on are modelled here. Everything else a plugin
 * entry may carry (`author`, `category`, `keywords`, `hooks`, …) is preserved
 * on `MarketplaceDescriptor.raw` and merged back at serialization time, so an
 * unmanaged entry survives a Packmind publish unchanged.
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
