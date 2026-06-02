import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces/SpaceId';
import { PackageId } from '../Package';

/**
 * Payload emitted when one or more Packmind packages are deleted in batch.
 *
 * Consumed by the deployments listener that cascades each affected package's
 * live marketplace distributions to `to_be_removed`. `userId` and
 * `organizationId` are merged in via the `UserEvent` base.
 */
export interface PackagesDeletedPayload {
  packageIds: PackageId[];
  spaceId: SpaceId;
}

export class PackagesDeletedEvent extends UserEvent<PackagesDeletedPayload> {
  static override readonly eventName = 'deployments.packages.deleted';
}
