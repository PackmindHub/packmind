import { IUseCase, PackmindCommand } from '@packmind/types';
import { Target } from '../Target';
import { GitRepoId } from '../../git';

export type AddTargetCommand = PackmindCommand & {
  name: string;
  path: string;
  gitRepoId: GitRepoId;
};

export type IAddTargetUseCase = IUseCase<AddTargetCommand, Target>;
