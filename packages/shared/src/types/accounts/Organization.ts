import { Branded, brandedIdFactory } from '../brandedTypes';

export type Organization = {
  id: OrganizationId;
  name: string;
  slug: string;
};

export type OrganizationId = Branded<'OrganizationId'>;
export const createOrganizationId = brandedIdFactory<OrganizationId>();
