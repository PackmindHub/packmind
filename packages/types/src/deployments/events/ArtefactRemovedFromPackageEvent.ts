import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { PackageId } from '../Package';

export interface ArtefactRemovedFromPackagePayload {
  artefactId: string;
  spaceId: SpaceId;
  packageId: PackageId;
  remainingPackagesCount: number;
}

export class ArtefactRemovedFromPackageEvent extends UserEvent<ArtefactRemovedFromPackagePayload> {
  static override readonly eventName = 'deployments.package.artefact_removed';
}
