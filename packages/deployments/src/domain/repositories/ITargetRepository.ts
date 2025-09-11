import { Target, TargetId, GitRepoId } from '@packmind/shared/types';

export interface ITargetRepository {
  add(target: Target): Promise<Target>;
  findByGitRepoId(gitRepoId: GitRepoId): Promise<Target[]>;
  findById(id: TargetId): Promise<Target | null>;
}
