import { GitCommit, GitCommitId } from '../entities/GitCommit';

export interface IGitCommitRepository {
  add(gitCommit: Omit<GitCommit, 'id'>): Promise<GitCommit>;
  get(id: GitCommitId): Promise<GitCommit | null>;
}
