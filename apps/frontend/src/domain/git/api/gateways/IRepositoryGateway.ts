import { GitRepoId } from '@packmind/types';

export interface Repository {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
}

export interface IRepositoryGateway {
  getRepositories(): Promise<Repository[]>;
}
