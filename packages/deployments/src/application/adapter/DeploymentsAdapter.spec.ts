import {
  RenderPackageAsPluginCommand,
  TrackPluginDeletedCommand,
} from '@packmind/types';
import { DeploymentsAdapter } from './DeploymentsAdapter';

describe('DeploymentsAdapter', () => {
  describe('renderPackageAsPlugin', () => {
    it('delegates to RenderPackageAsPluginUseCase', async () => {
      const response = {
        files: [],
        skippedStandardsCount: 0,
        pluginName: 'security',
        pluginVersion: '0.1.0',
      };
      const execute = jest.fn().mockResolvedValue(response);

      const adapter = new DeploymentsAdapter(
        {} as never,
        {} as never,
        {} as never,
      );
      (
        adapter as unknown as {
          _renderPackageAsPluginUseCase: { execute: typeof execute };
        }
      )._renderPackageAsPluginUseCase = { execute };

      const command = {
        userId: 'u',
        organizationId: 'o',
        packageSlug: 'security',
        mode: 'marketplace',
        pluginRoot: 'plugins/security/',
        pluginName: 'security',
      } as RenderPackageAsPluginCommand;

      const result = await adapter.renderPackageAsPlugin(command);

      expect(execute).toHaveBeenCalledWith(command);
      expect(result).toBe(response);
    });
  });

  describe('trackPluginDeleted', () => {
    it('delegates to TrackPluginDeletedUseCase', async () => {
      const response = { tracked: true };
      const execute = jest.fn().mockResolvedValue(response);

      const adapter = new DeploymentsAdapter(
        {} as never,
        {} as never,
        {} as never,
      );
      (
        adapter as unknown as {
          _trackPluginDeletedUseCase: { execute: typeof execute };
        }
      )._trackPluginDeletedUseCase = { execute };

      const command = {
        userId: 'u',
        organizationId: 'o',
        packageSlug: 'security',
      } as TrackPluginDeletedCommand;

      const result = await adapter.trackPluginDeleted(command);

      expect(execute).toHaveBeenCalledWith(command);
      expect(result).toBe(response);
    });
  });
});
