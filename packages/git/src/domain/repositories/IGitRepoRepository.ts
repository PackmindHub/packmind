import { GitRepo } from '../entities/GitRepo';
import { GitProviderId } from '../entities/GitProvider';
import { OrganizationId } from '@packmind/accounts/types';
import { IRepository, QueryOption } from '@packmind/shared';

export interface IGitRepoRepository extends IRepository<GitRepo> {
  findByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null>;
  findByOwnerRepoAndBranchInOrganization(
    owner: string,
    repo: string,
    branch: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null>;
  findByProviderId(providerId: GitProviderId): Promise<GitRepo[]>;
  findByOrganizationId(organizationId: OrganizationId): Promise<GitRepo[]>;
  list(organizationId?: OrganizationId): Promise<GitRepo[]>;
}
