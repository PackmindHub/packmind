import { RecipeVersion } from '../../recipes';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { CodingAgent } from '../CodingAgent';

export type PreviewArtifactRenderingCommand = {
  codingAgent: CodingAgent;
  recipeVersions: RecipeVersion[];
  standardVersions: StandardVersion[];
  skillVersions: SkillVersion[];
};

export type PreviewArtifactRenderingResponse = {
  fileName: string;
  fileContent: string;
};
