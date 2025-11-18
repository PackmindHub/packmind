import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerListRecipesTool } from './listRecipes.tool';
import { ToolDependencies, UserContext } from './types';

describe('listRecipes.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{
    recipesHexa: () => unknown;
    spacesHexa: () => unknown;
  }>;
  let userContext: UserContext;
  let toolHandler: () => Promise<{ content: { type: string; text: string }[] }>;

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
      recipesHexa: jest.fn(),
      spacesHexa: jest.fn(),
    } as unknown as jest.Mocked<{
      recipesHexa: () => unknown;
      spacesHexa: () => unknown;
    }>;

    dependencies = {
      fastify: mockFastify as unknown as ToolDependencies['fastify'],
      userContext,
      analyticsAdapter: mockAnalyticsAdapter,
      logger: mockLogger,
      mcpToolPrefix: 'packmind',
    };

    mcpServer = {
      tool: jest.fn((name, description, schema, handler) => {
        if (name === 'packmind_list_recipes') {
          toolHandler = handler;
        }
      }),
    } as unknown as McpServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerListRecipesTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'packmind_list_recipes',
      'Get a list of current recipes in Packmind.',
      {},
      expect.any(Function),
    );
  });

  it('returns formatted list of recipes sorted by slug', async () => {
    const mockRecipesAdapter = {
      listRecipesBySpace: jest.fn().mockResolvedValue([
        { slug: 'recipe-b', name: 'Recipe B' },
        { slug: 'recipe-a', name: 'Recipe A' },
      ]),
    };

    const mockSpacesAdapter = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([
        {
          id: 'space-1',
          name: 'Global Space',
        },
      ]),
    };

    mockFastify.recipesHexa.mockReturnValue({
      getAdapter: () => mockRecipesAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListRecipesTool(dependencies, mcpServer);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: '• recipe-a: Recipe A\n• recipe-b: Recipe B',
        },
      ],
    });
  });

  it('limits results to 20 recipes', async () => {
    const mockRecipes = Array.from({ length: 25 }, (_, i) => ({
      slug: `recipe-${i.toString().padStart(2, '0')}`,
      name: `Recipe ${i}`,
    }));

    const mockRecipesAdapter = {
      listRecipesBySpace: jest.fn().mockResolvedValue(mockRecipes),
    };

    const mockSpacesAdapter = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([
        {
          id: 'space-1',
          name: 'Global Space',
        },
      ]),
    };

    mockFastify.recipesHexa.mockReturnValue({
      getAdapter: () => mockRecipesAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListRecipesTool(dependencies, mcpServer);

    const result = await toolHandler();

    const lines = result.content[0].text.split('\n');
    expect(lines).toHaveLength(20);
  });

  describe('when no recipes found', () => {
    it('returns message', async () => {
      const mockRecipesAdapter = {
        listRecipesBySpace: jest.fn().mockResolvedValue([]),
      };

      const mockSpacesAdapter = {
        listSpacesByOrganization: jest.fn().mockResolvedValue([
          {
            id: 'space-1',
            name: 'Global Space',
          },
        ]),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockRecipesAdapter,
      });

      mockFastify.spacesHexa.mockReturnValue({
        getAdapter: () => mockSpacesAdapter,
      });

      registerListRecipesTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No recipes found for your organization',
          },
        ],
      });
    });
  });

  it('tracks analytics event on success', async () => {
    const mockRecipesAdapter = {
      listRecipesBySpace: jest
        .fn()
        .mockResolvedValue([{ slug: 'recipe-a', name: 'Recipe A' }]),
    };

    const mockSpacesAdapter = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([
        {
          id: 'space-1',
          name: 'Global Space',
        },
      ]),
    };

    mockFastify.recipesHexa.mockReturnValue({
      getAdapter: () => mockRecipesAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListRecipesTool(dependencies, mcpServer);

    await toolHandler();

    expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
      'user-123',
      'org-123',
      'mcp_tool_call',
      { tool: 'packmind_list_recipes' },
    );
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerListRecipesTool(dependencies, mcpServer);

      await expect(toolHandler()).rejects.toThrow(
        'User context is required to list recipes',
      );
    });
  });

  describe('when adapter throws error', () => {
    it('returns error message', async () => {
      const mockRecipesAdapter = {
        listRecipesBySpace: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
      };

      const mockSpacesAdapter = {
        listSpacesByOrganization: jest.fn().mockResolvedValue([
          {
            id: 'space-1',
            name: 'Global Space',
          },
        ]),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockRecipesAdapter,
      });

      mockFastify.spacesHexa.mockReturnValue({
        getAdapter: () => mockSpacesAdapter,
      });

      registerListRecipesTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list recipes: Database error',
          },
        ],
      });
    });
  });

  describe('when getGlobalSpace fails', () => {
    it('returns error message', async () => {
      const mockSpacesAdapter = {
        listSpacesByOrganization: jest
          .fn()
          .mockRejectedValue(new Error('Space not found')),
      };

      mockFastify.spacesHexa.mockReturnValue({
        getAdapter: () => mockSpacesAdapter,
      });

      registerListRecipesTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list recipes: Space not found',
          },
        ],
      });
    });
  });
});
