import { IUseCase, PackmindCommand } from '../../UseCase';

export type RenderPackageAsPluginMode = 'marketplace' | 'standalone';

export type RenderPackageAsPluginCommand = PackmindCommand & {
  /** Opaque package slug, e.g. `security` or `@space/security`. */
  packageSlug: string;
  /** Whether the plugin is rendered into a marketplace repo or a standalone workspace. */
  mode: RenderPackageAsPluginMode;
  /** Relative path used as the plugin-root prefix for every emitted file path. */
  pluginRoot: string;
  /**
   * Requested plugin name. Advisory only: the rendered plugin `name` (in both
   * plugin.json and the marketplace descriptor) is always normalized to the
   * package slug, because Claude Code requires a space-free slug and rejects
   * free-text names (e.g. a package renamed to "definition of ready").
   */
  pluginName: string;
  /** Git remote URL of the render target; empty/undefined when the CLI is not in a git repo. */
  gitRemoteUrl?: string;
  /** Git branch of the render target. */
  gitBranch?: string;
};

export type RenderedPluginFile = {
  path: string;
  content: string;
};

export type RenderPackageAsPluginResponse = {
  files: RenderedPluginFile[];
  skippedStandardsCount: number;
  pluginName: string;
  pluginDescription?: string;
  pluginVersion: string;
  /** Id of the distribution written by best-effort tracking; absent when no distribution was created. */
  distributionId?: string;
};

export type IRenderPackageAsPluginUseCase = IUseCase<
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse
>;
