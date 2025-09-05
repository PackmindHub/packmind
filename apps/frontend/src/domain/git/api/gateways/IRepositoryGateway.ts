import { GitRepoId } from '@packmind/git/types';

export interface Repository {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
}

export interface IRepositoryGateway {
  getRepositories(): Promise<Repository[]>;
}
