export type PluginManifestInput = {
  /** The plugin identifier: always the package slug, so installs survive renames. */
  name: string;
  /** Free-text name of the distributed release; absent for unversioned renders. */
  displayName?: string;
  description?: string;
  version: string;
  /**
   * Path to the plugin's hooks file, relative to the plugin root.
   *
   * Only GitHub Copilot needs it: it discovers hooks through this manifest key,
   * whereas Claude Code finds `hooks/hooks.json` by convention. Omitted, the
   * key is absent from the manifest entirely.
   */
  hooks?: string;
};

export function buildPluginManifest(input: PluginManifestInput): string {
  const manifest: Record<string, string> = { name: input.name };
  if (input.displayName) {
    manifest['displayName'] = input.displayName;
  }
  if (input.description) {
    manifest['description'] = input.description;
  }
  manifest['version'] = input.version;
  if (input.hooks) {
    manifest['hooks'] = input.hooks;
  }
  return JSON.stringify(manifest, null, 2) + '\n';
}
