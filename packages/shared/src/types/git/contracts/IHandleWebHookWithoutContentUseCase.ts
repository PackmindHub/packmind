import { ISystemUseCase, SystemPackmindCommand } from '@packmind/types';
import { GitCommit } from '../GitCommit';
import { GitRepoId } from '../GitRepo';

export type HandleWebHookWithoutContentCommand = SystemPackmindCommand & {
  gitRepoId: GitRepoId;
  payload: unknown;
  fileMatcher: RegExp;
};

export type HandleWebHookWithoutContentResult = {
  gitCommit: GitCommit;
  filePath: string;
}[];

export type IHandleWebHookWithoutContentUseCase = ISystemUseCase<
  HandleWebHookWithoutContentCommand,
  HandleWebHookWithoutContentResult
>;
