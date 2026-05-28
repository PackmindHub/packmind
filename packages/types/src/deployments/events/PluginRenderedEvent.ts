import { UserEvent } from '../../events';
import { RenderPackageAsPluginMode } from '../contracts/IRenderPackageAsPluginUseCase';
import { PackageId } from '../Package';

export interface PluginRenderedPayload {
  packageId: PackageId;
  packageSlug: string;
  mode: RenderPackageAsPluginMode;
  pluginRoot: string;
  marketplaceRepo?: string;
}

export class PluginRenderedEvent extends UserEvent<PluginRenderedPayload> {
  static override readonly eventName = 'deployments.plugin.rendered';
}
