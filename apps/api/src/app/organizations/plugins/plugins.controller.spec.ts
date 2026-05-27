import { NotFoundException } from '@nestjs/common';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { PackagesNotFoundError } from '@packmind/deployments';
import { OrganizationId, RenderPackageAsPluginResponse } from '@packmind/types';

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
    service = {
      renderPlugin: jest.fn(),
    } as unknown as jest.Mocked<PluginsService>;
    controller = new PluginsController(service);
  });

  describe('render', () => {
    it('delegates to the service with the assembled command', async () => {
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
      service.renderPlugin.mockResolvedValue(response);

      const result = await controller.render(orgId, body, request);

      expect(service.renderPlugin).toHaveBeenCalledWith({
        userId,
        organizationId: orgId,
        packageSlug: 'security',
        mode: 'marketplace',
        pluginRoot: 'plugins/security/',
        pluginName: 'security',
      });
      expect(result).toBe(response);
    });

    it('translates PackagesNotFoundError to a NotFoundException', async () => {
      service.renderPlugin.mockRejectedValue(
        new PackagesNotFoundError(['security']),
      );

      await expect(controller.render(orgId, body, request)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
