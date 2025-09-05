import { Factory } from '@packmind/shared/test';
import { v4 as uuidv4 } from 'uuid';
import {
  createStandardId,
  createStandardVersionId,
  createUserId,
  StandardVersion,
} from '@packmind/shared';

export const standardVersionFactory: Factory<StandardVersion> = (
  standardVersion?: Partial<StandardVersion>,
) => {
  return {
    id: createStandardVersionId(uuidv4()),
    standardId: createStandardId(uuidv4()),
    name: 'Test Standard Version',
    slug: 'test-standard-version',
    description: 'Test standard version description',
    version: 1,
    summary: null,
    gitCommit: undefined,
    userId: createUserId(uuidv4()), // Default to having a userId, can be overridden
    scope: null,
    ...standardVersion,
  };
};
