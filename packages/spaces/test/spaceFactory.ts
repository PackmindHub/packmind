import {
  createOrganizationId,
  createSpaceId,
  Space,
  SpaceColor,
  SpaceType,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_FACTORY_COLOR: SpaceColor = 'blue';

export function spaceFactory(overrides: Partial<Space> = {}): Space {
  return {
    id: createSpaceId(uuidv4()),
    name: 'Test Space',
    slug: 'test-space',
    type: SpaceType.open,
    organizationId: createOrganizationId(uuidv4()),
    isDefaultSpace: false,
    color: DEFAULT_FACTORY_COLOR,
    ...overrides,
  };
}
