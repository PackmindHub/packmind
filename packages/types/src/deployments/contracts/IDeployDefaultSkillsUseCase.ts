import { IUseCase, PackmindCommand } from '../../UseCase';
import { CodingAgent } from '../../coding-agent/CodingAgent';
import { FileUpdates } from '../FileUpdates';

export type DeployDefaultSkillsCommand = PackmindCommand & {
  cliVersion?: string;
  includeBeta?: boolean;
  // Optional agents to generate skills for (overrides org-level config when present)
  agents?: CodingAgent[];
};

export type DeployDefaultSkillsResponse = {
  fileUpdates: FileUpdates;
};

export type IDeployDefaultSkillsUseCase = IUseCase<
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse
>;
