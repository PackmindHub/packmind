import { Target, TargetId, GitRepoId } from '@packmind/shared/types';
import { IRepository } from '@packmind/shared';

export interface ITargetRepository extends IRepository<Target> {
  add(target: Target): Promise<Target>;
  findByGitRepoId(gitRepoId: GitRepoId): Promise<Target[]>;
  findById(id: TargetId): Promise<Target | null>;
  updateById(
    id: TargetId,
    updates: Partial<Pick<Target, 'name' | 'path'>>,
  ): Promise<Target>;
}
