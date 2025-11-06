import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { createUserId } from '@packmind/types';
import {
  createStandardId,
  createStandardVersionId,
  StandardVersion,
} from '@packmind/types';

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
