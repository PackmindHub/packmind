import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerNotifyRecipeUsageTool } from './notifyRecipeUsage.tool';
import { ToolDependencies, UserContext } from './types';

describe('notifyRecipeUsage.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ analyticsHexa: () => unknown }>;
  let userContext: UserContext;

  beforeEach(() => {
    const mockLogger = stubLogger();

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
      analyticsHexa: jest.fn(),
    } as unknown as jest.Mocked<{ analyticsHexa: () => unknown }>;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyRecipeUsage', () => {
    let toolHandler: (params: {
      recipeSlugs: string[];
      aiAgent: string;
      gitRepo?: string;
      target?: string;
    }) => Promise<{ content: { type: string; text: string }[] }>;

    beforeEach(() => {
      (mcpServer.tool as jest.Mock).mockImplementation(
        (name, description, schema, handler) => {
          if (name === 'notify_recipe_usage') {
            toolHandler = handler;
          }
        },
      );
    });

    it('registers the tool with correct name and description', () => {
      registerNotifyRecipeUsageTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'notify_recipe_usage',
        'Notify a reusable coding recipe deployed with Packmind has been used by an AI Agent such as GitHub Copilot, Claude Code or Cursor.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('tracks recipe usage with recipeSlugs, aiAgent, gitRepo, target', async () => {
      const mockUsageRecords = [
        { id: 'usage-1', recipeSlug: 'recipe-a', aiAgent: 'Claude Code' },
      ];
      const mockAdapter = {
        trackRecipeUsage: jest.fn().mockResolvedValue(mockUsageRecords),
      };

      mockFastify.analyticsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerNotifyRecipeUsageTool(dependencies, mcpServer);

      const result = await toolHandler({
        recipeSlugs: ['recipe-a'],
        aiAgent: 'Claude Code',
        gitRepo: 'owner/repo',
        target: '/src/',
      });

      expect(mockAdapter.trackRecipeUsage).toHaveBeenCalledWith({
        recipeSlugs: ['recipe-a'],
        aiAgent: 'Claude Code',
        userId: 'user-123',
        organizationId: 'org-123',
        gitRepo: 'owner/repo',
        target: '/src/',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Recipe usage tracked successfully. Created 1 usage records for AI agent: Claude Code in repository: owner/repo',
          },
        ],
      });
    });

    it('tracks recipe usage with optional gitRepo and target parameters', async () => {
      const mockUsageRecords = [
        { id: 'usage-1', recipeSlug: 'recipe-b', aiAgent: 'GitHub Copilot' },
      ];
      const mockAdapter = {
        trackRecipeUsage: jest.fn().mockResolvedValue(mockUsageRecords),
      };

      mockFastify.analyticsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerNotifyRecipeUsageTool(dependencies, mcpServer);

      const result = await toolHandler({
        recipeSlugs: ['recipe-b'],
        aiAgent: 'GitHub Copilot',
      });

      expect(mockAdapter.trackRecipeUsage).toHaveBeenCalledWith({
        recipeSlugs: ['recipe-b'],
        aiAgent: 'GitHub Copilot',
        userId: 'user-123',
        organizationId: 'org-123',
        gitRepo: undefined,
        target: undefined,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Recipe usage tracked successfully. Created 1 usage records for AI agent: GitHub Copilot',
          },
        ],
      });
    });

    it('tracks recipe usage with multiple recipe slugs', async () => {
      const mockUsageRecords = [
        { id: 'usage-1', recipeSlug: 'recipe-a', aiAgent: 'Cursor' },
        { id: 'usage-2', recipeSlug: 'recipe-b', aiAgent: 'Cursor' },
        { id: 'usage-3', recipeSlug: 'recipe-c', aiAgent: 'Cursor' },
      ];
      const mockAdapter = {
        trackRecipeUsage: jest.fn().mockResolvedValue(mockUsageRecords),
      };

      mockFastify.analyticsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerNotifyRecipeUsageTool(dependencies, mcpServer);

      const result = await toolHandler({
        recipeSlugs: ['recipe-a', 'recipe-b', 'recipe-c'],
        aiAgent: 'Cursor',
        gitRepo: 'myorg/myrepo',
        target: '/',
      });

      expect(mockAdapter.trackRecipeUsage).toHaveBeenCalledWith({
        recipeSlugs: ['recipe-a', 'recipe-b', 'recipe-c'],
        aiAgent: 'Cursor',
        userId: 'user-123',
        organizationId: 'org-123',
        gitRepo: 'myorg/myrepo',
        target: '/',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Recipe usage tracked successfully. Created 3 usage records for AI agent: Cursor in repository: myorg/myrepo',
          },
        ],
      });
    });

    it('tracks analytics event on success', async () => {
      const mockUsageRecords = [
        { id: 'usage-1', recipeSlug: 'recipe-a', aiAgent: 'Claude Code' },
      ];
      const mockAdapter = {
        trackRecipeUsage: jest.fn().mockResolvedValue(mockUsageRecords),
      };

      mockFastify.analyticsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerNotifyRecipeUsageTool(dependencies, mcpServer);

      await toolHandler({
        recipeSlugs: ['recipe-a'],
        aiAgent: 'Claude Code',
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        { tool: 'notify_recipe_usage' },
      );
    });

    describe('when user context is missing', () => {
      it('throws error', async () => {
        dependencies.userContext = undefined;

        registerNotifyRecipeUsageTool(dependencies, mcpServer);

        await expect(
          toolHandler({
            recipeSlugs: ['recipe-a'],
            aiAgent: 'Claude Code',
          }),
        ).rejects.toThrow('User context is required to track recipe usage');
      });
    });

    describe('when adapter throws error', () => {
      it('returns error message', async () => {
        const mockAdapter = {
          trackRecipeUsage: jest
            .fn()
            .mockRejectedValue(new Error('Database connection failed')),
        };

        mockFastify.analyticsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerNotifyRecipeUsageTool(dependencies, mcpServer);

        const result = await toolHandler({
          recipeSlugs: ['recipe-a'],
          aiAgent: 'Claude Code',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to track recipe usage: Database connection failed',
            },
          ],
        });
      });
    });
  });
});
