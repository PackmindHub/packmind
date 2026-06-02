import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces/SpaceId';
import { PackageId } from '../Package';

/**
 * Payload emitted when one or more Packmind packages are deleted in batch.
 *
 * Generic deployments-domain event: downstream listeners may subscribe to
 * react to package deletion (e.g. cascading cleanup of derived resources).
 * `userId` and `organizationId` are merged in via the `UserEvent` base.
 */
export interface PackagesDeletedPayload {
  packageIds: PackageId[];
  spaceId: SpaceId;
}

export class PackagesDeletedEvent extends UserEvent<PackagesDeletedPayload> {
  static override readonly eventName = 'deployments.packages.deleted';
}
