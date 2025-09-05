import { Factory } from '@packmind/shared/test';
import {
  createOrganizationId,
  Organization,
} from '../src/domain/entities/Organization';
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
