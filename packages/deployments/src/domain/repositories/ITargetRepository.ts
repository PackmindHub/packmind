import { Target, TargetId, GitRepoId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface ITargetRepository extends IRepository<Target> {
  add(target: Target): Promise<Target>;
  findByGitRepoId(gitRepoId: GitRepoId): Promise<Target[]>;
  findById(id: TargetId): Promise<Target | null>;
  updateById(
    id: TargetId,
    updates: Partial<Pick<Target, 'name' | 'path'>>,
  ): Promise<Target>;
}
