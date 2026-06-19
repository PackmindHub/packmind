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
  /** Git remote URL of the render target; empty/undefined when the CLI is not in a git repo. */
  gitRemoteUrl?: string;
  /** Git branch of the render target. */
  gitBranch?: string;
  /**
   * When present (marketplace mode only), instructs the deployer to bundle
   * install-tracking hook files into the plugin. Absent → no tracking files
   * emitted (standalone renders are unchanged).
   */
  installTracking?: {
    /** Base URL of the Packmind API, e.g. `https://app.packmind.io/api`. */
    apiBaseUrl: string;
    /** Marketplace name, used as the hook's `marketplaceName` payload field. */
    marketplaceName: string;
    /** Plugin slug matching `MarketplaceDistribution.pluginSlug`. */
    pluginSlug: string;
    /** Write-only tracking token baked into the published plugin. */
    trackingToken: string;
  };
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
