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
    packageSlug?: string;
    relativePath?: string;
    agentRendering?: boolean;
    gitRemoteUrl?: string;
    gitBranch?: string;
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

  describe('when agentRendering is false or not provided', () => {
    it('returns installation instructions', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({});

      expect(result.content[0].text).toContain(
        '# Package Installation Instructions',
      );
      expect(result.content[0].text).toContain('packmind_list_packages');
      expect(result.content[0].text).toContain('packmind-cli install');
      expect(result.content[0].text).toContain('agentRendering');
    });

    it('tracks analytics with instructions mode', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({});

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        expect.objectContaining({
          tool: 'install_package',
          mode: 'instructions',
        }),
      );
    });

    it('logs info when returning instructions', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({});

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Returning installation instructions',
        expect.objectContaining({
          organizationId: 'org-123',
          userId: 'user-123',
        }),
      );
    });

    it('does not call deploymentsHexa when returning instructions', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({});

      expect(mockFastify.deploymentsHexa).not.toHaveBeenCalled();
    });
  });

  describe('when agentRendering is true', () => {
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

    it('returns error when packageSlug is missing', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        agentRendering: true,
      });

      expect(result.content[0].text).toContain(
        'Error: packageSlug is required',
      );
    });

    it('returns prompt with file updates', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        agentRendering: true,
      });

      expect(result.content[0].text).toContain(
        '# Package Installation: my-package',
      );
      expect(result.content[0].text).toContain('createOrUpdate');
      expect(result.content[0].text).toContain('delete');
      expect(result.content[0].text).toContain(
        'Apply ALL file changes listed above',
      );
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
        agentRendering: true,
      });

      expect(mockAdapter.pullAllContent).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: 'org-123',
        packagesSlugs: ['my-package'],
      });
    });

    it('tracks analytics with agent_rendering mode', async () => {
      registerInstallPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        agentRendering: true,
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        expect.objectContaining({
          tool: 'install_package',
          packageSlug: 'my-package',
          mode: 'agent_rendering',
        }),
      );
    });
  });

  describe('when gitRemoteUrl is provided with agentRendering=true', () => {
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
        agentRendering: true,
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
        agentRendering: true,
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

  describe('when gitRemoteUrl is not provided with agentRendering=true', () => {
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
        agentRendering: true,
      });

      expect(mockAdapter.notifyDistribution).not.toHaveBeenCalled();
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
        agentRendering: true,
        gitRemoteUrl: 'https://github.com/owner/repo',
      });

      expect(result.content[0].text).toContain('# Package Installation');
      expect(result.content[0].text).toContain('test.md');
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
        agentRendering: true,
        gitRemoteUrl: 'https://github.com/owner/repo',
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

      await expect(toolHandler({})).rejects.toThrow(
        'User context is required to install a package',
      );
    });
  });

  describe('when deploymentsHexa is not available', () => {
    it('returns error message', async () => {
      mockFastify.deploymentsHexa.mockReturnValue(null);

      registerInstallPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        agentRendering: true,
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
        agentRendering: true,
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
    it('includes sections in the response', async () => {
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
        agentRendering: true,
      });

      expect(result.content[0].text).toContain('sections');
      expect(result.content[0].text).toContain('standards');
    });
  });
});
