import {
  ListMarketplaceDistributionsCommand,
  MarkPluginForRemovalCommand,
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

      adapter = new DeploymentsAdapter(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
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

      adapter = new DeploymentsAdapter(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
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

  describe('markPluginForRemoval', () => {
    const response = { distribution: { id: 'd1' } } as never;
    let execute: jest.Mock;
    let adapter: DeploymentsAdapter;
    let command: MarkPluginForRemovalCommand;
    let result: typeof response;

    beforeEach(async () => {
      execute = jest.fn().mockResolvedValue(response);

      adapter = new DeploymentsAdapter(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      (
        adapter as unknown as {
          _markPluginForRemovalUseCase: { execute: typeof execute };
        }
      )._markPluginForRemovalUseCase = { execute };

      command = {
        userId: 'u',
        organizationId: 'o',
        marketplaceId: 'm',
        distributionId: 'd1',
      } as MarkPluginForRemovalCommand;

      result = await adapter.markPluginForRemoval(command);
    });

    it('delegates to MarkPluginForRemovalUseCase with the command', () => {
      expect(execute).toHaveBeenCalledWith(command);
    });

    it('returns the use case response', () => {
      expect(result).toBe(response);
    });
  });

  describe('listMarketplaceDistributions', () => {
    const response = [] as never;
    let execute: jest.Mock;
    let adapter: DeploymentsAdapter;
    let command: ListMarketplaceDistributionsCommand;
    let result: typeof response;

    beforeEach(async () => {
      execute = jest.fn().mockResolvedValue(response);

      adapter = new DeploymentsAdapter(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      (
        adapter as unknown as {
          _listMarketplaceDistributionsUseCase: { execute: typeof execute };
        }
      )._listMarketplaceDistributionsUseCase = { execute };

      command = {
        userId: 'u',
        organizationId: 'o',
        marketplaceId: 'm',
      } as ListMarketplaceDistributionsCommand;

      result = await adapter.listMarketplaceDistributions(command);
    });

    it('delegates to ListMarketplaceDistributionsUseCase with the command', () => {
      expect(execute).toHaveBeenCalledWith(command);
    });

    it('returns the use case response', () => {
      expect(result).toBe(response);
    });
  });
});
