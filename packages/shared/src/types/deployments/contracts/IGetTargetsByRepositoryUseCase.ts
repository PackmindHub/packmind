import { IUseCase, PackmindCommand } from '../../UseCase';
import { Target } from '../Target';
import { GitRepoId } from '../../git';

export type GetTargetsByRepositoryCommand = PackmindCommand & {
  gitRepoId: GitRepoId;
};

export type IGetTargetsByRepositoryUseCase = IUseCase<
  GetTargetsByRepositoryCommand,
  Target[]
>;
