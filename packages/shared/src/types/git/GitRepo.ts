import { Branded, brandedIdFactory } from '../brandedTypes';
import { GitProviderId } from '../git';

export type GitRepoId = Branded<'GitRepoId'>;
export const createGitRepoId = brandedIdFactory<GitRepoId>();

export type GitRepo = {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  providerId: GitProviderId;
};
