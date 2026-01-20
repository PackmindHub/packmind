import { RecipeVersion } from '../../recipes';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { FileUpdates } from '../../deployments';
import { CodingAgent } from '../CodingAgent';

export type GenerateRemovalUpdatesCommand = {
  removed: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
  installed: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
  codingAgents: CodingAgent[];
};

export type GenerateRemovalUpdatesResponse = FileUpdates;
