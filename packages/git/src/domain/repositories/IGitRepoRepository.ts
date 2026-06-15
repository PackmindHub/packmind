import { GitRepo } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
import { GitRepoType } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';
import { QueryOption } from '@packmind/types';

/**
 * Type filter accepted by repository finders.
 *
 * - A concrete `GitRepoType` value (`'standard'` | `'marketplace'`) restricts
 *   the query to that type only.
 * - `'any'` opts out of the type filter entirely — used by the marketplace
 *   link pre-flight collision check.
 */
export type GitRepoTypeFilter = GitRepoType | 'any';

export interface IGitRepoRepository extends IRepository<GitRepo> {
  findByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'> & {
      type?: GitRepoTypeFilter;
    },
  ): Promise<GitRepo | null>;
  findByOwnerRepoAndBranchInOrganization(
    owner: string,
    repo: string,
    branch: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'> & {
      type?: GitRepoTypeFilter;
    },
  ): Promise<GitRepo | null>;
  findByOwnerAndRepoInOrganization(
    owner: string,
    repo: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'> & {
      type?: GitRepoTypeFilter;
      providerId?: GitProviderId;
    },
  ): Promise<GitRepo | null>;
  findByProviderId(
    providerId: GitProviderId,
    opts?: { type?: GitRepoTypeFilter },
  ): Promise<GitRepo[]>;
  findByOrganizationId(
    organizationId: OrganizationId,
    opts?: { type?: GitRepoTypeFilter },
  ): Promise<GitRepo[]>;
  list(
    organizationId?: OrganizationId,
    opts?: { type?: GitRepoTypeFilter },
  ): Promise<GitRepo[]>;
}
