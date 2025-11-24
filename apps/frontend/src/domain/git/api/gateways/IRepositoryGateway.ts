import { GitRepoId, OrganizationId } from '@packmind/types';

export interface Repository {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
}

export interface IRepositoryGateway {
  getRepositories(organizationId: OrganizationId): Promise<Repository[]>;
}
