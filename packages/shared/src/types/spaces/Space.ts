import { Branded, brandedIdFactory } from '@packmind/types';
import { OrganizationId } from '@packmind/types';

export type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  organizationId: OrganizationId;
};

export type SpaceId = Branded<'SpaceId'>;

export const createSpaceId = brandedIdFactory<SpaceId>();
