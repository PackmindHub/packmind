import { Factory } from '@packmind/test-utils';
import { createOrganizationId, Organization } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const organizationFactory: Factory<Organization> = (
  organization?: Partial<Organization>,
) => {
  return {
    id: createOrganizationId(uuidv4()),
    name: 'Test Organization',
    slug: 'test-organization',
    ...organization,
  };
};
