import { UserEvent } from '../../events';
import { PackageId } from '../Package';

export interface PluginDeletedPayload {
  packageId: PackageId;
  packageSlug: string;
  marketplaceRepo?: string;
}

export class PluginDeletedEvent extends UserEvent<PluginDeletedPayload> {
  static override readonly eventName = 'deployments.plugin.deleted';
}
