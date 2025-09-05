import { Branded, brandedIdFactory } from '../brandedTypes';

export type GitCommitId = Branded<'GitCommitId'>;
export const createGitCommitId = brandedIdFactory<GitCommitId>();

export type GitCommit = {
  id: GitCommitId;
  sha: string;
  message: string;
  author: string;
  url: string;
};
