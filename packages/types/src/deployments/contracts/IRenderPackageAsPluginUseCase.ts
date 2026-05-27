import { IUseCase, PackmindCommand } from '../../UseCase';

export type RenderPackageAsPluginMode = 'marketplace' | 'standalone';

export type RenderPackageAsPluginCommand = PackmindCommand & {
  /** Opaque package slug, e.g. `security` or `@space/security`. */
  packageSlug: string;
  /** Whether the plugin is rendered into a marketplace repo or a standalone workspace. */
  mode: RenderPackageAsPluginMode;
  /** Relative path used as the plugin-root prefix for every emitted file path. */
  pluginRoot: string;
  /** Requested plugin name; may differ from the package slug. */
  pluginName: string;
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
};

export type IRenderPackageAsPluginUseCase = IUseCase<
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse
>;
