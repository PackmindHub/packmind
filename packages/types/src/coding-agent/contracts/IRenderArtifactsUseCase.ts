import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeVersion } from '../../recipes';
import { StandardVersion } from '../../standards';
import { FileUpdates } from '../../deployments';
import { CodingAgent } from './IPrepareRecipesDeploymentUseCase';

export type RenderArtifactsCommand = PackmindCommand & {
  recipeVersions: RecipeVersion[];
  standardVersions: StandardVersion[];
  codingAgents: CodingAgent[];
  existingFiles: Map<string, string>; // key: filePath (e.g., "CLAUDE.md"), value: current file content
};

export type RenderArtifactsResponse = FileUpdates;

export type IRenderArtifactsUseCase = IUseCase<
  RenderArtifactsCommand,
  RenderArtifactsResponse
>;
