import { CommandVersion } from '../../commands';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { FileUpdates } from '../../deployments';
import { CodingAgent } from '../CodingAgent';

export type GenerateRemovalUpdatesCommand = {
  removed: {
    recipeVersions: CommandVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
  installed: {
    recipeVersions: CommandVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
  codingAgents: CodingAgent[];
};

export type GenerateRemovalUpdatesResponse = FileUpdates;
