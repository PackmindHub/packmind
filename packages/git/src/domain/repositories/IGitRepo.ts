import { GitCommit } from '@packmind/types';

export type CommitFile = {
  path: string;
  content: string;
  permissions?: string;
};

export interface IGitRepo {
  commitFiles(
    files: CommitFile[],
    commitMessage: string,
    deleteFiles?: { path: string }[],
  ): Promise<Omit<GitCommit, 'id'>>;

  getFileOnRepo(
    path: string,
    branch?: string,
  ): Promise<{
    sha: string;
    content: string;
    execute_filemode?: boolean;
  } | null>;

  listDirectoriesOnRepo(
    name: string,
    owner: string,
    branch: string,
    path?: string,
  ): Promise<string[]>;

  checkDirectoryExists(directoryPath: string, branch: string): Promise<boolean>;

  listFilesInDirectory(
    path: string,
    branch: string,
  ): Promise<{ path: string }[]>;
}
