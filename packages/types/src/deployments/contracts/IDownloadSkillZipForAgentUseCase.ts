import { CodingAgent } from '../../coding-agent/CodingAgent';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';

export type DownloadSkillZipForAgentCommand = PackmindCommand & {
  skillId: SkillId;
  spaceId: SpaceId;
  agent: CodingAgent;
};

export type DownloadSkillZipForAgentResponse = {
  fileName: string;
  fileContent: string;
};

export type IDownloadSkillZipForAgentUseCase = IUseCase<
  DownloadSkillZipForAgentCommand,
  DownloadSkillZipForAgentResponse
>;
