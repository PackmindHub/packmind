import { CommandVersion } from '../../commands';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { CodingAgent } from '../CodingAgent';

export type PreviewArtifactRenderingCommand = {
  codingAgent: CodingAgent;
  recipeVersions: CommandVersion[];
  standardVersions: StandardVersion[];
  skillVersions: SkillVersion[];
};

export type PreviewArtifactRenderingResponse = {
  fileName: string;
  fileContent: string;
};
