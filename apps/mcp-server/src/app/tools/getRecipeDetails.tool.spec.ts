import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerGetRecipeDetailsTool } from './getRecipeDetails.tool';
import { ToolDependencies, UserContext } from './types';

describe('getRecipeDetails.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ recipesHexa: () => unknown }>;
  let userContext: UserContext;
  let toolHandler: (params: {
    recipeSlug: string;
  }) => Promise<{ content: { type: string; text: string }[] }>;

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
    } as unknown as jest.Mocked<{ recipesHexa: () => unknown }>;

    dependencies = {
      fastify: mockFastify as unknown as ToolDependencies['fastify'],
      userContext,
      analyticsAdapter: mockAnalyticsAdapter,
      logger: mockLogger,
      mcpToolPrefix: 'packmind',
    };

    mcpServer = {
      tool: jest.fn((name, description, schema, handler) => {
        if (name === 'packmind_get_recipe_details') {
          toolHandler = handler;
        }
      }),
    } as unknown as McpServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerGetRecipeDetailsTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'packmind_get_recipe_details',
      'Get the full content of a recipe by its slug.',
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('returns formatted recipe details', async () => {
    const mockRecipe = {
      slug: 'test-recipe',
      name: 'Test Recipe',
      version: 1,
      content: '## Steps\n\n1. Step one\n2. Step two',
    };

    const mockRecipesAdapter = {
      findRecipeBySlug: jest.fn().mockResolvedValue(mockRecipe),
    };

    mockFastify.recipesHexa.mockReturnValue({
      getAdapter: () => mockRecipesAdapter,
    });

    registerGetRecipeDetailsTool(dependencies, mcpServer);

    const result = await toolHandler({ recipeSlug: 'test-recipe' });

    expect(result.content[0].text).toContain('# Test Recipe');
    expect(result.content[0].text).toContain('**Slug:** test-recipe');
    expect(result.content[0].text).toContain('**Version:** 1');
    expect(result.content[0].text).toContain('## Steps');
    expect(result.content[0].text).toContain('1. Step one');
  });

  describe('when recipe does not exist', () => {
    it('returns not found message', async () => {
      const mockRecipesAdapter = {
        findRecipeBySlug: jest.fn().mockResolvedValue(null),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockRecipesAdapter,
      });

      registerGetRecipeDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ recipeSlug: 'non-existent' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Recipe with slug 'non-existent' not found in your organization",
          },
        ],
      });
    });
  });

  it('tracks analytics event on success', async () => {
    const mockRecipe = {
      slug: 'test-recipe',
      name: 'Test Recipe',
      version: 1,
      content: 'Recipe content',
    };

    const mockRecipesAdapter = {
      findRecipeBySlug: jest.fn().mockResolvedValue(mockRecipe),
    };

    mockFastify.recipesHexa.mockReturnValue({
      getAdapter: () => mockRecipesAdapter,
    });

    registerGetRecipeDetailsTool(dependencies, mcpServer);

    await toolHandler({ recipeSlug: 'test-recipe' });

    expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
      'user-123',
      'org-123',
      'mcp_tool_call',
      { tool: 'packmind_get_recipe_details', recipeSlug: 'test-recipe' },
    );
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerGetRecipeDetailsTool(dependencies, mcpServer);

      await expect(toolHandler({ recipeSlug: 'test-recipe' })).rejects.toThrow(
        'User context is required to get recipe by slug',
      );
    });
  });

  describe('when adapter throws error', () => {
    it('returns error message', async () => {
      const mockRecipesAdapter = {
        findRecipeBySlug: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockRecipesAdapter,
      });

      registerGetRecipeDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ recipeSlug: 'test-recipe' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get recipe: Database error',
          },
        ],
      });
    });
  });

  it('handles recipe with empty content', async () => {
    const mockRecipe = {
      slug: 'empty-recipe',
      name: 'Empty Recipe',
      version: 1,
      content: '',
    };

    const mockRecipesAdapter = {
      findRecipeBySlug: jest.fn().mockResolvedValue(mockRecipe),
    };

    mockFastify.recipesHexa.mockReturnValue({
      getAdapter: () => mockRecipesAdapter,
    });

    registerGetRecipeDetailsTool(dependencies, mcpServer);

    const result = await toolHandler({ recipeSlug: 'empty-recipe' });

    expect(result.content[0].text).toContain('# Empty Recipe');
    expect(result.content[0].text).toContain('**Slug:** empty-recipe');
  });
});
