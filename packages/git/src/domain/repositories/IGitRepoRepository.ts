import { GitRepo } from '../entities/GitRepo';
import { GitProviderId } from '../entities/GitProvider';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/shared';
import { QueryOption } from '@packmind/types';

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
