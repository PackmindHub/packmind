import { IUseCase, PackmindCommand } from '../../UseCase';

export type GetGitHubAppStatusCommand = PackmindCommand;

export type GetGitHubAppStatusResponse =
  | { registered: false }
  | {
      registered: true;
      slug: string;
      appId: number;
      htmlUrl: string;
      installUrl: string;
    };

export type IGetGitHubAppStatusUseCase = IUseCase<
  GetGitHubAppStatusCommand,
  GetGitHubAppStatusResponse
>;
