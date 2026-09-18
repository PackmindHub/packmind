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
   * Targets with any distribution activity for a package in the given space,
   * scoped to the organization — so the application layer never has to read the
   * distribution rows itself.
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
