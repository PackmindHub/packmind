import { Branded, brandedIdFactory } from '@packmind/shared/types';

export type Organization = {
  id: OrganizationId;
  name: string;
  slug: string;
};

export type OrganizationId = Branded<'OrganizationId'>;
export const createOrganizationId = brandedIdFactory<OrganizationId>();
