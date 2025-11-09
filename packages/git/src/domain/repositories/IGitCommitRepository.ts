import { GitCommit, GitCommitId } from '@packmind/types';

export interface IGitCommitRepository {
  add(gitCommit: Omit<GitCommit, 'id'>): Promise<GitCommit>;
  get(id: GitCommitId): Promise<GitCommit | null>;
}
