import {
  RenderPackageAsPluginCommand,
  TrackPluginDeletedCommand,
} from '@packmind/types';
import { DeploymentsAdapter } from './DeploymentsAdapter';

describe('DeploymentsAdapter', () => {
  describe('renderPackageAsPlugin', () => {
    const response = {
      files: [],
      skippedStandardsCount: 0,
      pluginName: 'security',
      pluginVersion: '0.1.0',
    };
    let execute: jest.Mock;
    let adapter: DeploymentsAdapter;
    let command: RenderPackageAsPluginCommand;
    let result: typeof response;

    beforeEach(async () => {
      execute = jest.fn().mockResolvedValue(response);

      adapter = new DeploymentsAdapter({} as never, {} as never, {} as never);
      (
        adapter as unknown as {
          _renderPackageAsPluginUseCase: { execute: typeof execute };
        }
      )._renderPackageAsPluginUseCase = { execute };

      command = {
        userId: 'u',
        organizationId: 'o',
        packageSlug: 'security',
        mode: 'marketplace',
        pluginRoot: 'plugins/security/',
        pluginName: 'security',
      } as RenderPackageAsPluginCommand;

      result = await adapter.renderPackageAsPlugin(command);
    });

    it('delegates to RenderPackageAsPluginUseCase', () => {
      expect(execute).toHaveBeenCalledWith(command);
    });

    it('returns the use case response', () => {
      expect(result).toBe(response);
    });
  });

  describe('trackPluginDeleted', () => {
    const response = { tracked: true };
    let execute: jest.Mock;
    let adapter: DeploymentsAdapter;
    let command: TrackPluginDeletedCommand;
    let result: typeof response;

    beforeEach(async () => {
      execute = jest.fn().mockResolvedValue(response);

      adapter = new DeploymentsAdapter({} as never, {} as never, {} as never);
      (
        adapter as unknown as {
          _trackPluginDeletedUseCase: { execute: typeof execute };
        }
      )._trackPluginDeletedUseCase = { execute };

      command = {
        userId: 'u',
        organizationId: 'o',
        packageSlug: 'security',
      } as TrackPluginDeletedCommand;

      result = await adapter.trackPluginDeleted(command);
    });

    it('delegates to TrackPluginDeletedUseCase', () => {
      expect(execute).toHaveBeenCalledWith(command);
    });

    it('returns the use case response', () => {
      expect(result).toBe(response);
    });
  });
});
