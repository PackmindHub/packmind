/**
 * Source coordinates that tell a marketplace consumer how to fetch a plugin
 * entry's content, discriminated by `source`:
 *
 * - `git-subdir` — Claude Code shape: clone `url`, read the plugin from
 *   `path` inside the clone.
 * - `github` — GitHub Copilot shape: `repo` is an `owner/name` slug resolved
 *   against github.com; `path` (optional) points at the plugin subdirectory
 *   and `ref` (optional) pins a branch, tag, or commit.
 *
 * Other vendor-specific source kinds (HTTP archive, registry, etc.) are
 * appended to the union without touching call sites that already accept
 * `PluginSource`.
 */
export type PluginSource =
  | {
      source: 'git-subdir';
      url: string;
      path: string;
    }
  | {
      source: 'github';
      repo: string;
      path?: string;
      ref?: string;
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
