import { ISystemUseCase, SystemPackmindCommand } from '../../UseCase';
import { GitCommit } from '../GitCommit';
import { GitRepoId } from '../GitRepoId';

export type HandleWebHookCommand = SystemPackmindCommand & {
  gitRepoId: GitRepoId;
  payload: unknown;
  fileMatcher: RegExp;
};

export type HandleWebHookResult = {
  gitCommit: GitCommit;
  filePath: string;
  fileContent: string;
}[];

export type IHandleWebHookUseCase = ISystemUseCase<
  HandleWebHookCommand,
  HandleWebHookResult
>;
