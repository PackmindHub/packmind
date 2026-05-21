import {
  Target,
  TargetId,
  GitRepoId,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface ITargetRepository extends IRepository<Target> {
  add(target: Target): Promise<Target>;
  findByGitRepoId(gitRepoId: GitRepoId): Promise<Target[]>;
  findById(id: TargetId): Promise<Target | null>;
  findByIdsInOrganization(
    targetIds: TargetId[],
    organizationId: OrganizationId,
  ): Promise<Target[]>;
  /**
   * Find all targets that have any distribution activity for packages in the
   * given space, scoped to the organization. Used to surface the set of
   * targets relevant to a space without first needing the list of distribution
   * rows in the application layer.
   */
  findActiveInSpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<Target[]>;
  updateById(
    id: TargetId,
    updates: Partial<Pick<Target, 'name' | 'path'>>,
  ): Promise<Target>;
}
