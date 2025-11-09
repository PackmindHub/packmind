import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createUserId,
  createStandardId,
  Standard,
  createSpaceId,
} from '@packmind/types';

export const standardFactory: Factory<Standard> = (
  standard?: Partial<Standard>,
) => {
  return {
    id: createStandardId(uuidv4()),
    name: 'Test Standard',
    slug: 'test-standard',
    description: 'Test standard description',
    version: 1,
    gitCommit: undefined,
    userId: createUserId(uuidv4()),
    scope: null,
    spaceId: createSpaceId(uuidv4()),
    ...standard,
  };
};
