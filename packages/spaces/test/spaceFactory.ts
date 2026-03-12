import {
  createOrganizationId,
  createSpaceId,
  Space,
  SpaceType,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export function spaceFactory(overrides: Partial<Space> = {}): Space {
  return {
    id: createSpaceId(uuidv4()),
    name: 'Test Space',
    slug: 'test-space',
    type: SpaceType.open,
    organizationId: createOrganizationId(uuidv4()),
    ...overrides,
  };
}
