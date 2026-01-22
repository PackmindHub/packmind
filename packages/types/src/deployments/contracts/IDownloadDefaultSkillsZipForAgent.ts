import { CodingAgent } from '../../coding-agent/CodingAgent';
import { IPublicUseCase } from '../../UseCase';

export type DownloadDefaultSkillsZipForAgentCommand = {
  agent: CodingAgent;
};

export type DownloadDefaultSkillsZipForAgentResponse = {
  fileName: string;
  fileContent: string;
};

export type IDownloadDefaultSkillsZipForAgentUseCase = IPublicUseCase<
  DownloadDefaultSkillsZipForAgentCommand,
  DownloadDefaultSkillsZipForAgentResponse
>;
