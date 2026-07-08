import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandVersion } from '../../commands';
import { SkillVersion } from '../../skills';
import { StandardVersion } from '../../standards';
import { FileUpdates } from '../../deployments';

import { CodingAgent } from '../CodingAgent';

export type RenderArtifactsCommand = PackmindCommand & {
  installed: {
    recipeVersions: CommandVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  };
  removed: {
    recipeVersions: CommandVersion[];
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
