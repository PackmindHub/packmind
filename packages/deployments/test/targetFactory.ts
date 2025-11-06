import { Factory } from '@packmind/test-utils';
import { createTargetId, Target, createGitRepoId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const targetFactory: Factory<Target> = (target?: Partial<Target>) => {
  return {
    id: createTargetId(uuidv4()),
    name: 'default',
    path: '/',
    gitRepoId: createGitRepoId(uuidv4()),
    ...target,
  };
};
