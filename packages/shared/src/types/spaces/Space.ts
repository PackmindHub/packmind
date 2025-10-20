import { Branded, brandedIdFactory } from '../brandedTypes';
import { OrganizationId } from '../accounts';

export type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  organizationId: OrganizationId;
};

export type SpaceId = Branded<'SpaceId'>;

export const createSpaceId = brandedIdFactory<SpaceId>();
