import { createMockInstance } from '@packmind/test-utils';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { PackagesNotFoundError } from '@packmind/deployments';
import {
  OrganizationId,
  PackageNotPublishableAsPluginError,
  RenderPackageAsPluginResponse,
  TrackPluginDeletedResponse,
} from '@packmind/types';

import { PluginsController } from './plugins.controller';
import { PluginsService } from './plugins.service';

describe('PluginsController', () => {
  let controller: PluginsController;
  let service: jest.Mocked<PluginsService>;

  const orgId = 'org-123' as OrganizationId;
  const userId = 'user-123';
  const request = {
    user: { userId },
  } as AuthenticatedRequest;

  const body = {
    packageSlug: 'security',
    mode: 'marketplace' as const,
    pluginRoot: 'plugins/security/',
    pluginName: 'security',
  };

  beforeEach(() => {
    service = createMockInstance(PluginsService);
    controller = new PluginsController(service);
  });

  describe('render', () => {
    describe('delegates to the service with the assembled command', () => {
      const response: RenderPackageAsPluginResponse = {
        files: [
          {
            path: 'plugins/security/.claude-plugin/plugin.json',
            content: '{}',
          },
        ],
        skippedStandardsCount: 2,
        pluginName: 'security',
        pluginVersion: '0.1.0',
      };
      let result: RenderPackageAsPluginResponse;

      beforeEach(async () => {
        service.renderPlugin.mockResolvedValue(response);
        result = await controller.render(orgId, body, request);
      });

      it('calls the service with the assembled command', () => {
        expect(service.renderPlugin).toHaveBeenCalledWith({
          userId,
          organizationId: orgId,
          packageSlug: 'security',
          mode: 'marketplace',
          pluginRoot: 'plugins/security/',
          pluginName: 'security',
          gitRemoteUrl: undefined,
          gitBranch: undefined,
        });
      });

      it('returns the service result', () => {
        expect(result).toBe(response);
      });
    });

    it('passes gitRemoteUrl and gitBranch from the body into the command', async () => {
      const response: RenderPackageAsPluginResponse = {
        files: [],
        skippedStandardsCount: 0,
        pluginName: 'security',
        pluginVersion: '0.1.0',
      };
      service.renderPlugin.mockResolvedValue(response);

      await controller.render(
        orgId,
        {
          ...body,
          gitRemoteUrl: 'git@github.com:acme/repo.git',
          gitBranch: 'main',
        },
        request,
      );

      expect(service.renderPlugin).toHaveBeenCalledWith(
        expect.objectContaining({
          gitRemoteUrl: 'git@github.com:acme/repo.git',
          gitBranch: 'main',
        }),
      );
    });

    it('passes targetVendor from the body into the command', async () => {
      const response: RenderPackageAsPluginResponse = {
        files: [],
        skippedStandardsCount: 0,
        pluginName: 'security',
        pluginVersion: '0.1.0',
      };
      service.renderPlugin.mockResolvedValue(response);

      await controller.render(
        orgId,
        { ...body, targetVendor: 'github' },
        request,
      );

      expect(service.renderPlugin).toHaveBeenCalledWith(
        expect.objectContaining({ targetVendor: 'github' }),
      );
    });

    it('lets PackagesNotFoundError through for the filter to answer', async () => {
      service.renderPlugin.mockRejectedValue(
        new PackagesNotFoundError(['security']),
      );

      await expect(controller.render(orgId, body, request)).rejects.toThrow(
        PackagesNotFoundError,
      );
    });

    describe('when the package holds only standards', () => {
      let thrown: unknown;

      beforeEach(async () => {
        service.renderPlugin.mockRejectedValue(
          new PackageNotPublishableAsPluginError('security', 'Security'),
        );
        thrown = await controller
          .render(orgId, body, request)
          .then(() => undefined)
          .catch((error: unknown) => error);
      });

      it('lets PackageNotPublishableAsPluginError through for the filter', () => {
        expect(thrown).toBeInstanceOf(PackageNotPublishableAsPluginError);
      });

      it('answers conflict, since the package contents rule the publish out', () => {
        expect((thrown as PackageNotPublishableAsPluginError).kind).toBe(
          'conflict',
        );
      });

      it('keeps the domain error message so the CLI can show it', () => {
        expect((thrown as Error).message).toBe(
          'Cannot publish: package "Security" has no skill or command. A marketplace plugin needs at least one skill or command — standards alone are not enough.',
        );
      });
    });
  });

  describe('trackDeleted', () => {
    const trackBody = {
      packageSlug: 'security',
      gitRemoteUrl: 'git@github.com:acme/repo.git',
    };

    describe('maps the body into the command and returns the service result', () => {
      const response: TrackPluginDeletedResponse = { tracked: true };
      let result: TrackPluginDeletedResponse;

      beforeEach(async () => {
        service.trackPluginDeleted.mockResolvedValue(response);
        result = await controller.trackDeleted(orgId, trackBody, request);
      });

      it('calls the service with the assembled command', () => {
        expect(service.trackPluginDeleted).toHaveBeenCalledWith({
          userId,
          organizationId: orgId,
          packageSlug: 'security',
          gitRemoteUrl: 'git@github.com:acme/repo.git',
        });
      });

      it('returns the service result', () => {
        expect(result).toBe(response);
      });
    });

    it('lets PackagesNotFoundError through for the filter to answer', async () => {
      service.trackPluginDeleted.mockRejectedValue(
        new PackagesNotFoundError(['security']),
      );

      await expect(
        controller.trackDeleted(orgId, trackBody, request),
      ).rejects.toThrow(PackagesNotFoundError);
    });
  });
});
