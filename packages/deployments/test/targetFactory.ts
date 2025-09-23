import { Factory } from '@packmind/shared/test';
import { createTargetId, Target } from '@packmind/shared';
import { createGitRepoId } from '@packmind/shared';
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
