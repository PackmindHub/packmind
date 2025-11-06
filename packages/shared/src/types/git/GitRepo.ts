import { GitRepoId, createGitRepoId } from '@packmind/types';
import { GitProviderId } from '../git';

// Re-export for backward compatibility
export type { GitRepoId };
export { createGitRepoId };

export type GitRepo = {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  providerId: GitProviderId;
};
