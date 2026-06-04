import { GitRepoId } from './GitRepoId';
import { GitProviderId } from './GitProvider';
import { GitRepoType } from './GitRepoType';

export type GitRepo = {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  providerId: GitProviderId;
  type: GitRepoType;
};
