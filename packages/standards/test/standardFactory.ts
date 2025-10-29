import { Factory } from '@packmind/shared/test';
import { v4 as uuidv4 } from 'uuid';
import { createStandardId, createUserId, Standard } from '@packmind/shared';
import { createSpaceId } from '@packmind/spaces';

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
