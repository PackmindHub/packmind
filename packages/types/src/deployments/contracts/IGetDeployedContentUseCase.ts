import { IUseCase, PackmindCommand } from '../../UseCase';
import { IPullContentResponse } from './IPullContentUseCase';
import { CodingAgent } from '../../coding-agent/CodingAgent';
import { TargetId } from '../TargetId';
import { PackageId } from '../Package';

export type GetDeployedContentCommand = PackmindCommand & {
  packagesSlugs: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
  agents?: CodingAgent[];
};

export type GetDeployedContentResponse = IPullContentResponse & {
  targetId?: TargetId;
  packageIds?: PackageId[];
};

export type IGetDeployedContentUseCase = IUseCase<
  GetDeployedContentCommand,
  GetDeployedContentResponse
>;
