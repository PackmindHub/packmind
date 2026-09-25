import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when a Packmind package cannot be published as a managed
 * plugin because the marketplace already exposes an **unmanaged** plugin
 * with the same name/slug.
 *
 * Packmind refuses to clobber unmanaged entries — admins must rename the
 * package or remove the colliding plugin from `marketplace.json` first.
 */
export class MarketplacePluginNameConflictError extends MarketplacesError {
  constructor(
    public readonly pluginSlug: string,
    public readonly marketplaceName: string,
  ) {
    super(
      'conflict',
      'marketplace_plugin_name_conflict',
      { pluginSlug, marketplaceName },
      `Cannot publish: plugin "${pluginSlug}" already exists on marketplace "${marketplaceName}" and is not managed by Packmind`,
    );
    this.name = 'MarketplacePluginNameConflictError';
  }
}
