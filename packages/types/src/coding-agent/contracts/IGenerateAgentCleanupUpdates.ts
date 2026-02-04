import { RecipeVersion } from '../../recipes';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { FileUpdates } from '../../deployments';
import { CodingAgent } from '../CodingAgent';

export type GenerateAgentCleanupUpdatesCommand = {
  agents: CodingAgent[];
  artifacts: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
};

export type GenerateAgentCleanupUpdatesResponse = FileUpdates;
