import { Branded, brandedIdFactory, OrganizationId } from '@packmind/types';
import {} from '@packmind/shared/types';

export type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  organizationId: OrganizationId;
};

export type SpaceId = Branded<'SpaceId'>;

export const createSpaceId = brandedIdFactory<SpaceId>();
