import { CommandVersion } from '../../commands/CommandVersion';
import { SkillVersion } from '../../skills/SkillVersion';
import { StandardVersion } from '../../standards/StandardVersion';
import { RenderedPluginFile } from '../../deployments/contracts/IRenderPackageAsPluginUseCase';

export type RenderPackageAsClaudePluginCommand = {
  pluginName: string;
  pluginDescription?: string;
  pluginVersion: string;
  pluginRoot: string;
  recipeVersions: CommandVersion[];
  skillVersions: SkillVersion[];
  standardVersions: StandardVersion[];
};

export type RenderPackageAsClaudePluginResponse = {
  files: RenderedPluginFile[];
  /**
   * Number of standards skipped during rendering. Claude plugins do not support
   * standards, so this count is surfaced to the caller as a "skipped" notice.
   */
  skippedStandardsCount: number;
};
