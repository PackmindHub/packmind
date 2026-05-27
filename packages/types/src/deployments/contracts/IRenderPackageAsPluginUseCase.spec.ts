import {
  IRenderPackageAsPluginUseCase,
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse,
} from './IRenderPackageAsPluginUseCase';

describe('IRenderPackageAsPluginUseCase types', () => {
  it('Command exposes packageSlug, mode, pluginRoot, and pluginName', () => {
    const cmd: RenderPackageAsPluginCommand = {
      userId: 'u',
      organizationId: 'o',
      packageSlug: 'security',
      mode: 'marketplace',
      pluginRoot: 'plugins/security/',
      pluginName: 'security',
    };
    expect(cmd.packageSlug).toBe('security');
    expect(cmd.mode).toBe('marketplace');
  });

  it('Response exposes files and skippedStandardsCount', () => {
    const res: RenderPackageAsPluginResponse = {
      files: [
        { path: 'plugins/security/commands/audit.md', content: '# audit' },
      ],
      skippedStandardsCount: 5,
      pluginName: 'security',
      pluginDescription: 'Security',
      pluginVersion: '0.1.0',
    };
    expect(res.files).toHaveLength(1);
    expect(res.skippedStandardsCount).toBe(5);
  });

  it('UseCase interface combines Command and Response', () => {
    const useCase: IRenderPackageAsPluginUseCase = {
      execute: async () => ({
        files: [],
        skippedStandardsCount: 0,
        pluginName: 'security',
        pluginVersion: '0.1.0',
      }),
    };
    expect(useCase.execute).toBeDefined();
  });
});
