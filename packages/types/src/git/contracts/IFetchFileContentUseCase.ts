import { OrganizationId } from '../../accounts/Organization';
import { GitCommit } from '../GitCommit';
import { GitRepoId } from '../GitRepoId';

export type FetchFileContentFile = {
  gitCommit: GitCommit;
  filePath: string;
};

export type FetchedFileContent = {
  gitCommit: GitCommit;
  filePath: string;
  fileContent: string;
};

export interface FetchFileContentInput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: FetchFileContentFile[];
}

export interface FetchFileContentOutput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: FetchedFileContent[];
}
