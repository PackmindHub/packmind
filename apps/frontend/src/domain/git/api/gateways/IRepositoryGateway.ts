import { GitProviderId, GitRepoId, OrganizationId } from '@packmind/types';

export interface Repository {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  providerId: GitProviderId;
}

export interface IRepositoryGateway {
  getRepositories(organizationId: OrganizationId): Promise<Repository[]>;
}
