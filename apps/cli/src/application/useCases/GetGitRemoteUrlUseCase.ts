import { IGetGitRemoteUrlUseCase } from '../../domain/useCases/IGetGitRemoteUrlUseCase';
import { GitService } from '../services/GitService';

export type GetGitRemoteUrlUseCaseCommand = {
  path: string;
  origin?: string;
};

export type GetGitRemoteUrlUseCaseResult = {
  gitRemoteUrl: string;
};

export class GetGitRemoteUrlUseCase implements IGetGitRemoteUrlUseCase {
  constructor(
    private readonly gitRemoteUrlService: GitService = new GitService(),
  ) {}

  public async execute(
    command: GetGitRemoteUrlUseCaseCommand,
  ): Promise<GetGitRemoteUrlUseCaseResult> {
    const { path: repoPath, origin } = command;

    return this.gitRemoteUrlService.getGitRemoteUrl(repoPath, origin);
  }
}
