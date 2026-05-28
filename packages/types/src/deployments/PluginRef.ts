/**
 * A single plugin entry declared inside a marketplace descriptor
 * (e.g. `marketplace.json`).
 *
 * Vendor-agnostic shape — concrete parsers in
 * `packages/deployments/.../parsers/` translate vendor-specific JSON into this
 * normalized form.
 */
export type PluginRef = {
  slug: string;
  name: string;
  version?: string;
};
