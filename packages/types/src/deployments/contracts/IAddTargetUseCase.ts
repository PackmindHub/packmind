import { IUseCase, PackmindCommand } from '../../UseCase';
import { Target } from '../Target';
import { GitRepoId } from '../../git/GitRepoId';

export type AddTargetCommand = PackmindCommand & {
  name: string;
  path: string;
  gitRepoId: GitRepoId;
  /**
   * Optional flag to allow adding targets to repositories on tokenless providers.
   * This is used internally by the CLI for tokenless distribution tracking.
   * API endpoints should always override this to false for security.
   * @default false
   */
  allowTokenlessProvider?: boolean;
};

export type IAddTargetUseCase = IUseCase<AddTargetCommand, Target>;
