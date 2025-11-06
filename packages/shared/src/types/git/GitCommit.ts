import { Branded, brandedIdFactory } from '@packmind/types';

export type GitCommitId = Branded<'GitCommitId'>;
export const createGitCommitId = brandedIdFactory<GitCommitId>();

export type GitCommit = {
  id: GitCommitId;
  sha: string;
  message: string;
  author: string;
  url: string;
};
