import { Factory } from '@packmind/test-utils';
import { GitRepo, createGitProviderId, createGitRepoId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const gitRepoFactory: Factory<GitRepo> = (
  gitRepo?: Partial<GitRepo>,
) => {
  return {
    id: createGitRepoId(uuidv4()),
    owner: 'test-owner',
    repo: 'test-repo',
    branch: 'main',
    providerId: createGitProviderId(uuidv4()),
    ...gitRepo,
  };
};
