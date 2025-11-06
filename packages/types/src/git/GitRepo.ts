import { GitRepoId } from './GitRepoId';
import { GitProviderId } from './GitProvider';

export type GitRepo = {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  providerId: GitProviderId;
};
