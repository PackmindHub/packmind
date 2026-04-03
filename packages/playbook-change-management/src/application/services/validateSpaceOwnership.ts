import { ISpacesPort, OrganizationId, Space, SpaceId } from '@packmind/types';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../domain/errors/SpaceOwnershipMismatchError';

export async function validateSpaceOwnership(
  spacesPort: ISpacesPort,
  spaceId: SpaceId,
  organizationId: OrganizationId,
): Promise<Space> {
  const space = await spacesPort.getSpaceById(spaceId);
  if (!space) {
    throw new SpaceNotFoundError(spaceId);
  }
  if (space.organizationId !== organizationId) {
    throw new SpaceOwnershipMismatchError(spaceId, organizationId);
  }
  return space;
}
