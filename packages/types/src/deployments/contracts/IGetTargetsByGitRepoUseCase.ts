import { IUseCase, PackmindCommand } from '../../UseCase';
import { Target } from '../Target';
import { GitRepoId } from '../../git/GitRepoId';

export type GetTargetsByGitRepoCommand = PackmindCommand & {
  gitRepoId: GitRepoId;
};

export type IGetTargetsByGitRepoUseCase = IUseCase<
  GetTargetsByGitRepoCommand,
  Target[]
>;
