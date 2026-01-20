import { RecipeVersion } from '../../recipes';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { FileUpdates } from '../../deployments';
import { CodingAgent } from '../CodingAgent';

export type DeployArtifactsForAgentsCommand = {
  recipeVersions: RecipeVersion[];
  standardVersions: StandardVersion[];
  skillVersions: SkillVersion[];
  codingAgents: CodingAgent[];
};

export type DeployArtifactsForAgentsResponse = FileUpdates;
