import { IUseCase, PackmindCommand } from '../../UseCase';
import { IPullContentResponse } from './IPullContentUseCase';
import { CodingAgent } from '../../coding-agent/CodingAgent';

export type GetDeployedContentCommand = PackmindCommand & {
  packagesSlugs: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
  agents?: CodingAgent[];
};

export type GetDeployedContentResponse = IPullContentResponse;

export type IGetDeployedContentUseCase = IUseCase<
  GetDeployedContentCommand,
  GetDeployedContentResponse
>;
