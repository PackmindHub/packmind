import {
  IRenderPackageAsPluginUseCase,
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse,
} from './IRenderPackageAsPluginUseCase';

describe('IRenderPackageAsPluginUseCase types', () => {
  describe('Command exposes packageSlug, mode, pluginRoot, and pluginName', () => {
    const cmd: RenderPackageAsPluginCommand = {
      userId: 'u',
      organizationId: 'o',
      packageSlug: 'security',
      mode: 'marketplace',
      pluginRoot: 'plugins/security/',
      pluginName: 'security',
    };

    it('exposes packageSlug', () => {
      expect(cmd.packageSlug).toBe('security');
    });

    it('exposes mode', () => {
      expect(cmd.mode).toBe('marketplace');
    });
  });

  describe('Response exposes files and skippedStandardsCount', () => {
    const res: RenderPackageAsPluginResponse = {
      files: [
        { path: 'plugins/security/commands/audit.md', content: '# audit' },
      ],
      skippedStandardsCount: 5,
      pluginName: 'security',
      pluginDescription: 'Security',
      pluginVersion: '0.1.0',
    };

    it('exposes files', () => {
      expect(res.files).toHaveLength(1);
    });

    it('exposes skippedStandardsCount', () => {
      expect(res.skippedStandardsCount).toBe(5);
    });
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
