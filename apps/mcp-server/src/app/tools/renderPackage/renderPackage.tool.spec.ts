import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerRenderPackageTool } from './renderPackage.tool';
import { ToolDependencies, UserContext } from '../types';

describe('renderPackage.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockLogger: ReturnType<typeof stubLogger>;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ deploymentsHexa: () => unknown }>;
  let userContext: UserContext;
  let toolHandler: (params: {
    packageSlug: string;
    installedPackages?: string[];
    relativePath: string;
    gitRemoteUrl: string;
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
        if (name === 'render_package') {
          toolHandler = handler;
        }
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerRenderPackageTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'render_package',
      expect.stringContaining('Render a Packmind package'),
      expect.any(Object),
      expect.any(Function),
    );
  });

  describe('when packageSlug is missing', () => {
    it('returns error', async () => {
      const mockAdapter = {
        pullAllContent: jest.fn(),
        notifyDistribution: jest.fn(),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerRenderPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: '',
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });

      expect(result.content[0].text).toContain(
        'Error: packageSlug is required',
      );
    });
  });

  describe('when rendering packages', () => {
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

    describe('when rendering a package', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        registerRenderPackageTool(dependencies, mcpServer);

        result = await toolHandler({
          packageSlug: 'my-package',
          relativePath: '/',
          gitRemoteUrl: '',
          gitBranch: '',
        });
      });

      it('includes package name in title', () => {
        expect(result.content[0].text).toContain(
          '# Package Rendering: my-package',
        );
      });

      it('includes createOrUpdate in response', () => {
        expect(result.content[0].text).toContain('createOrUpdate');
      });

      it('includes delete in response', () => {
        expect(result.content[0].text).toContain('delete');
      });

      it('includes apply instructions', () => {
        expect(result.content[0].text).toContain(
          'Apply ALL file changes listed above',
        );
      });
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

      registerRenderPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });

      expect(mockAdapter.pullAllContent).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: 'org-123',
        packagesSlugs: ['my-package'],
        source: 'mcp',
      });
    });

    it('calls pullAllContent with packageSlug and installedPackages combined', async () => {
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

      registerRenderPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'new-package',
        installedPackages: ['existing-package-1', 'existing-package-2'],
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });

      expect(mockAdapter.pullAllContent).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: 'org-123',
        packagesSlugs: [
          'new-package',
          'existing-package-1',
          'existing-package-2',
        ],
        source: 'mcp',
      });
    });

    it('tracks analytics', async () => {
      registerRenderPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        expect.objectContaining({
          tool: 'render_package',
          packageSlug: 'my-package',
          installedPackages: '',
          packageCount: '1',
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

      registerRenderPackageTool(dependencies, mcpServer);

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

      registerRenderPackageTool(dependencies, mcpServer);

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

  describe('when gitRemoteUrl is empty', () => {
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

      registerRenderPackageTool(dependencies, mcpServer);

      await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });

      expect(mockAdapter.notifyDistribution).not.toHaveBeenCalled();
    });
  });

  describe('when notifyDistribution fails', () => {
    let result: { content: { type: string; text: string }[] };

    beforeEach(async () => {
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

      registerRenderPackageTool(dependencies, mcpServer);

      result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: 'https://github.com/owner/repo',
        gitBranch: '',
      });
    });

    it('returns package rendering title', () => {
      expect(result.content[0].text).toContain('# Package Rendering');
    });

    it('returns file updates', () => {
      expect(result.content[0].text).toContain('test.md');
    });
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerRenderPackageTool(dependencies, mcpServer);

      await expect(
        toolHandler({
          packageSlug: 'my-package',
          relativePath: '/',
          gitRemoteUrl: '',
          gitBranch: '',
        }),
      ).rejects.toThrow('User context is required to render a package');
    });
  });

  describe('when deploymentsHexa is not available', () => {
    it('returns error message', async () => {
      mockFastify.deploymentsHexa.mockReturnValue(null);

      registerRenderPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to render packages: DeploymentsHexa not available',
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

      registerRenderPackageTool(dependencies, mcpServer);

      const result = await toolHandler({
        packageSlug: 'unknown-package',
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to render packages: Package not found',
          },
        ],
      });
    });
  });

  describe('when file updates include sections', () => {
    let result: { content: { type: string; text: string }[] };

    beforeEach(async () => {
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

      registerRenderPackageTool(dependencies, mcpServer);

      result = await toolHandler({
        packageSlug: 'my-package',
        relativePath: '/',
        gitRemoteUrl: '',
        gitBranch: '',
      });
    });

    it('includes sections key in the response', () => {
      expect(result.content[0].text).toContain('sections');
    });

    it('includes standards section in the response', () => {
      expect(result.content[0].text).toContain('standards');
    });

    it('includes start marker instruction', () => {
      expect(result.content[0].text).toContain(
        '<!-- start: ${section.key} -->',
      );
    });

    it('includes end marker instruction', () => {
      expect(result.content[0].text).toContain('<!-- end: ${section.key} -->');
    });

    it('includes append instruction for missing sections', () => {
      expect(result.content[0].text).toContain(
        'If the section does not exist, append to the end of the file',
      );
    });
  });
});
