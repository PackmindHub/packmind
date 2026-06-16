import {
  ListMarketplaceDistributionsCommand,
  Marketplace,
  MarkPluginForRemovalCommand,
  RenderPackageAsPluginCommand,
  TrackPluginDeletedCommand,
} from '@packmind/types';
import { Configuration } from '@packmind/node-utils';
import { marketplaceFactory } from '../../infra/repositories/__factories__/marketplaceFactory';
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

  describe('renderPluginForPublishJob (install-tracking metadata)', () => {
    type RenderForPublishJob = (params: {
      marketplace: Marketplace;
      package: { id: string; slug: string; name: string; spaceId: string };
      userId: string;
      organizationId: string;
    }) => Promise<unknown>;

    const pkg = {
      id: 'pkg-1',
      slug: 'security',
      name: 'Security',
      spaceId: 'space-1',
    } as unknown as import('@packmind/types').Package;

    const space = {
      id: 'space-1',
      slug: 'default',
      organizationId: 'org-1',
    } as unknown as import('@packmind/types').Space;

    let execute: jest.Mock;
    let adapter: DeploymentsAdapter;

    beforeEach(() => {
      jest
        .spyOn(Configuration, 'getConfig')
        .mockResolvedValue('https://app.packmind.io');

      execute = jest.fn().mockResolvedValue({
        files: [],
        skippedStandardsCount: 0,
        pluginName: 'Security',
        pluginVersion: '0.1.0',
      });

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
          spacesPort: { getSpaceById: jest.Mock };
        }
      )._renderPackageAsPluginUseCase = { execute };
      (
        adapter as unknown as {
          spacesPort: { getSpaceById: jest.Mock };
        }
      ).spacesPort = {
        getSpaceById: jest.fn().mockResolvedValue(space),
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when the marketplace has a tracking token', () => {
      let marketplace: Marketplace;

      beforeEach(async () => {
        marketplace = marketplaceFactory({
          name: 'ACME Marketplace',
          trackingToken: 'tok-abc-123',
        });

        await (
          adapter as unknown as {
            renderPluginForPublishJob: RenderForPublishJob;
          }
        ).renderPluginForPublishJob({
          marketplace,
          package: pkg,
          userId: 'u1',
          organizationId: 'org-1',
        });
      });

      it('passes installTracking with the token to RenderPackageAsPluginUseCase', () => {
        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            installTracking: expect.objectContaining({
              trackingToken: 'tok-abc-123',
            }),
          }),
        );
      });

      it('sets apiBaseUrl from APP_WEB_URL with the /api/v0 suffix', () => {
        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            installTracking: expect.objectContaining({
              apiBaseUrl: 'https://app.packmind.io/api/v0',
            }),
          }),
        );
      });

      it('sets marketplaceName from the marketplace entity', () => {
        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            installTracking: expect.objectContaining({
              marketplaceName: 'ACME Marketplace',
            }),
          }),
        );
      });

      it('sets pluginSlug from the package slug', () => {
        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            installTracking: expect.objectContaining({
              pluginSlug: 'security',
            }),
          }),
        );
      });
    });

    describe('when the marketplace has a null tracking token', () => {
      beforeEach(async () => {
        const marketplace = marketplaceFactory({ trackingToken: null });

        await (
          adapter as unknown as {
            renderPluginForPublishJob: RenderForPublishJob;
          }
        ).renderPluginForPublishJob({
          marketplace,
          package: pkg,
          userId: 'u1',
          organizationId: 'org-1',
        });
      });

      it('omits installTracking from the render command', () => {
        expect(execute).toHaveBeenCalledWith(
          expect.not.objectContaining({ installTracking: expect.anything() }),
        );
      });
    });

    describe('when APP_WEB_URL is not configured', () => {
      beforeEach(async () => {
        jest.spyOn(Configuration, 'getConfig').mockResolvedValue(undefined);
        const marketplace = marketplaceFactory({
          trackingToken: 'tok-abc-123',
        });

        await (
          adapter as unknown as {
            renderPluginForPublishJob: RenderForPublishJob;
          }
        ).renderPluginForPublishJob({
          marketplace,
          package: pkg,
          userId: 'u1',
          organizationId: 'org-1',
        });
      });

      it('omits installTracking rather than baking an unreachable URL', () => {
        expect(execute).toHaveBeenCalledWith(
          expect.not.objectContaining({ installTracking: expect.anything() }),
        );
      });
    });
  });
});
