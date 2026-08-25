import { UserEvent } from '../../events';
import { MarketplaceVendor } from '../../marketplaces/MarketplaceVendor';
import { RenderPackageAsPluginMode } from '../contracts/IRenderPackageAsPluginUseCase';
import { PackageId } from '../Package';

export interface PluginRenderedPayload {
  packageId: PackageId;
  packageSlug: string;
  mode: RenderPackageAsPluginMode;
  pluginRoot: string;
  marketplaceRepo?: string;
  /**
   * Vendor whose plugin format was rendered. Optional because not every
   * render call site is updated to populate it yet.
   */
  vendor?: MarketplaceVendor;
}

export class PluginRenderedEvent extends UserEvent<PluginRenderedPayload> {
  static override readonly eventName = 'deployments.plugin.rendered';
}
