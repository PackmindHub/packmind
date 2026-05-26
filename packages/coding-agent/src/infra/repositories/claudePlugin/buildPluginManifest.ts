export type PluginManifestInput = {
  name: string;
  description?: string;
  version: string;
};

export function buildPluginManifest(input: PluginManifestInput): string {
  const manifest: Record<string, string> = { name: input.name };
  if (input.description) manifest.description = input.description;
  manifest.version = input.version;
  return JSON.stringify(manifest, null, 2) + '\n';
}
