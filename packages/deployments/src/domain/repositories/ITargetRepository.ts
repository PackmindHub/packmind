import { Target, TargetId, GitRepoId, OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface ITargetRepository extends IRepository<Target> {
  add(target: Target): Promise<Target>;
  findByGitRepoId(gitRepoId: GitRepoId): Promise<Target[]>;
  findById(id: TargetId): Promise<Target | null>;
  findByIdsInOrganization(
    targetIds: TargetId[],
    organizationId: OrganizationId,
  ): Promise<Target[]>;
  updateById(
    id: TargetId,
    updates: Partial<Pick<Target, 'name' | 'path'>>,
  ): Promise<Target>;
}
