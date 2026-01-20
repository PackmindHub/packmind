import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';

export type DeployDefaultSkillsCommand = PackmindCommand;

export type DeployDefaultSkillsResponse = {
  fileUpdates: FileUpdates;
};

export type IDeployDefaultSkillsUseCase = IUseCase<
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse
>;
