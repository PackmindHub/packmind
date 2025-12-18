import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerInstallPackageTool } from './installPackage.tool';
import { ToolDependencies, UserContext } from './types';

describe('installPackage.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockLogger: ReturnType<typeof stubLogger>;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ deploymentsHexa: () => unknown }>;
  let userContext: UserContext;
  let toolHandler: (params: {
    packageSlug: string;
    relativePath: string;
    gitRemoteUrl?: string;
    gitBranch: string;
  }) => Promise<{ content: { type: string; text: string }[] }>;

  beforeEach(() => {
    mockLogger = stubLogger();

    mockAnalyticsAdapter = {
      trackEvent: jest.fn(),
    } as unknown as jest.Mocked<IEventTrackingPort>;

    userContext = {
      email: 'test@example.com',
      userId: 'user-123',
      organizationId: 'org-123',
      role: 'member',
    };

    mockFastify = {
      deploymentsHexa: jest.fn(),
    } as unknown as jest.Mocked<{ deploymentsHexa: () => unknown }>;

    dependencies = {
      fastify: mockFastify as unknown as ToolDependencies['fastify'],
      userContext,
      analyticsAdapter: mockAnalyticsAdapter,
      logger: mockLogger,
      mcpToolPrefix: 'packmind',
    };

    mcpServer = {
      tool: jest.fn(),
    } as unknown as McpServer;

    (mcpServer.tool as jest.Mock).mockImplementation(
      (name, description, schema, handler) => {
        if (name === 'install_package') {
          toolHandler = handler;
        }
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerInstallPackageTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'install_package',
      expect.stringContaining('Install a Packmind package'),
      expect.any(Object),
      expect.any(Function),
    );
  });

  describe('when installing package successfully', () => {
    const mockFileUpdates = {
      createOrUpdate: [
        { path: '.packmind/standards/test-standard.md', content: '# Standard' },
        { path: '.packmind/recipes/test-recipe.md', content: '# Recipe' },
      ],
      delete: [{ path: '.packmind/old-file.md' }],
    };

    beforeEach(() => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: mockFileUpdates,
        }),
        notifyDistribution: jest.fn().mockResolvedValue({
          deploymentId: 'dist-123',
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });
    });

    it('returns file updates as JSON', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.packageSlug).toBe('my-package');
      expect(responseData.fileUpdates.createOrUpdate).toHaveLength(2);
      expect(responseData.fileUpdates.delete).toHaveLength(1);
    });

    it('calls pullAllContent with correct parameters', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: mockFileUpdates,
        }),
        notifyDistribution: jest.fn().mockResolvedValue({
          deploymentId: 'dist-123',
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      expect(mockAdapter.pullAllContent).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: 'org-123',
        packagesSlugs: ['my-package'],
      });
    });

    it('tracks analytics event on success', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        expect.objectContaining({
          tool: 'install_package',
          packageSlug: 'my-package',
          relativePath: '/',
          hasGitRemoteUrl: 'false',
        }),
      );
    });
  });

  describe('when gitRemoteUrl is provided', () => {
    it('calls notifyDistribution to record the distribution', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
        }),
        notifyDistribution: jest.fn().mockResolvedValue({
          deploymentId: 'dist-123',
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/packages/app/',
        gitRemoteUrl: 'https://github.com/owner/repo',
        gitBranch: 'develop',
      });

      expect(mockAdapter.notifyDistribution).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: 'org-123',
        distributedPackages: ['my-package'],
        gitRemoteUrl: 'https://github.com/owner/repo',
        gitBranch: 'develop',
        relativePath: '/packages/app/',
      });
    });

    it('includes distributionId in response', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
        }),
        notifyDistribution: jest.fn().mockResolvedValue({
          deploymentId: 'dist-123',
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: 'https://github.com/owner/repo',
        gitBranch: 'main',
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.distributionId).toBe('dist-123');
    });

    it('tracks distributionRecorded as true', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
        }),
        notifyDistribution: jest.fn().mockResolvedValue({
          deploymentId: 'dist-123',
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: 'https://github.com/owner/repo',
        gitBranch: 'main',
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        expect.objectContaining({
          hasGitRemoteUrl: 'true',
          distributionRecorded: 'true',
        }),
      );
    });
  });

  describe('when gitRemoteUrl is not provided', () => {
    it('does not call notifyDistribution', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
        }),
        notifyDistribution: jest.fn(),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      expect(mockAdapter.notifyDistribution).not.toHaveBeenCalled();
    });

    it('returns undefined distributionId', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
        }),
        notifyDistribution: jest.fn(),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.distributionId).toBeUndefined();
    });
  });

  describe('when notifyDistribution fails', () => {
    it('still returns file updates successfully', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [{ path: 'test.md', content: '# Test' }],
            delete: [],
          },
        }),
        notifyDistribution: jest
          .fn()
          .mockRejectedValue(new Error('Distribution failed')),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: 'https://github.com/owner/repo',
        gitBranch: 'main',
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.fileUpdates.createOrUpdate).toHaveLength(1);
      expect(responseData.distributionId).toBeUndefined();
    });

    it('logs the error but does not fail', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
        }),
        notifyDistribution: jest
          .fn()
          .mockRejectedValue(new Error('Distribution failed')),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: 'https://github.com/owner/repo',
        gitBranch: 'main',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to record distribution, continuing with file updates',
        expect.objectContaining({
          packageSlug: 'my-package',
          gitRemoteUrl: 'https://github.com/owner/repo',
          error: 'Distribution failed',
        }),
      );
    });
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerInstallPackageTool(dependencies, mcpServer);

      await expect(
        toolHandler({
          packageSlug: 'my-package',
          relativePath: '/',
          gitBranch: 'main',
        }),
      ).rejects.toThrow('User context is required to install a package');
    });
  });

  describe('when deploymentsHexa is not available', () => {
    it('returns error message', async () => {
      mockFastify.deploymentsHexa.mockReturnValue(null);

      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to install package: DeploymentsHexa not available',
          },
        ],
      });
    });
  });

  describe('when pullAllContent fails', () => {
    it('returns error message', async () => {
      const mockAdapter = {
        pullAllContent: jest
          .fn()
          .mockRejectedValue(new Error('Package not found')),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'unknown-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to install package: Package not found',
          },
        ],
      });
    });
  });

  describe('when file updates include sections', () => {
    it('preserves sections in response', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn().mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                sections: [
                  { key: 'standards', content: '# Standards\n...' },
                  { key: 'recipes', content: '# Recipes\n...' },
                ],
              },
            ],
            delete: [],
          },
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitBranch: 'main',
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.fileUpdates.createOrUpdate[0].sections).toHaveLength(
        2,
      );
      expect(responseData.fileUpdates.createOrUpdate[0].sections[0].key).toBe(
        'standards',
      );
    });
  });
});
