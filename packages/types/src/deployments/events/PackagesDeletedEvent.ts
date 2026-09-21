import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces/SpaceId';
import { PackageId } from '../Package';

export interface PackagesDeletedPayload {
  packageIds: PackageId[];
  spaceId: SpaceId;
}

export class PackagesDeletedEvent extends UserEvent<PackagesDeletedPayload> {
  static override readonly eventName = 'deployments.packages.deleted';
}
