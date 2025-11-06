import { TargetId, createTargetId } from '@packmind/types';
import { GitRepo, GitRepoId } from '../git';

// Re-export for backward compatibility
export type { TargetId };
export { createTargetId };

export type Target = {
  id: TargetId;
  name: string;
  path: string;
  gitRepoId: GitRepoId;
  gitRepo?: GitRepo;
};
