import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeVersion } from '../../recipes';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { FileUpdates } from '../../deployments';

import { CodingAgent } from '../CodingAgent';

export type RenderArtifactsCommand = PackmindCommand & {
  installed: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
  removed: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
  codingAgents: CodingAgent[];
  existingFiles: Map<string, string>; // key: filePath (e.g., "CLAUDE.md"), value: current file content
};

export type RenderArtifactsResponse = FileUpdates;

export type IRenderArtifactsUseCase = IUseCase<
  RenderArtifactsCommand,
  RenderArtifactsResponse
>;
