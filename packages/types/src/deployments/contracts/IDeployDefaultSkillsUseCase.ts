import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';

export type DeployDefaultSkillsCommand = PackmindCommand & {
  cliVersion?: string;
  includeBeta?: boolean;
};

export type DeployDefaultSkillsResponse = {
  fileUpdates: FileUpdates;
};

export type IDeployDefaultSkillsUseCase = IUseCase<
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse
>;
