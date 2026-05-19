import { OrganizationId, SpaceId } from '@packmind/types';

export class SpaceOwnershipMismatchError extends Error {
  constructor(spaceId: SpaceId, organizationId: OrganizationId) {
    super(`Space ${spaceId} does not belong to organization ${organizationId}`);
    this.name = 'SpaceOwnershipMismatchError';
  }
}
