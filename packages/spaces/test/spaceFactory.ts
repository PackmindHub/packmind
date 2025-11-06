import { v4 as uuidv4 } from 'uuid';
import { Space, createSpaceId } from '../src/domain/entities/Space';
import { createOrganizationId } from '@packmind/types';

export function spaceFactory(overrides: Partial<Space> = {}): Space {
  return {
    id: createSpaceId(uuidv4()),
    name: 'Test Space',
    slug: 'test-space',
    organizationId: createOrganizationId(uuidv4()),
    ...overrides,
  };
}
