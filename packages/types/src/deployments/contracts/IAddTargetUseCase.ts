import { IUseCase, PackmindCommand } from '../../UseCase';
import { Target } from '../Target';
import { GitRepoId } from '../../git/GitRepoId';

export type AddTargetCommand = PackmindCommand & {
  name: string;
  path: string;
  gitRepoId: GitRepoId;
  /**
   * Allows a target on a repository whose provider has no token. Used internally
   * by the CLI for tokenless distribution tracking; API endpoints should always
   * force this to false rather than pass the caller's value through.
   * @default false
   */
  allowTokenlessProvider?: boolean;
};

export type IAddTargetUseCase = IUseCase<AddTargetCommand, Target>;
