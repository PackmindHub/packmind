import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerGetCommandDetailsTool } from './getCommandDetails.tool';
import { ToolDependencies, UserContext } from '../types';

describe('getCommandDetails.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ recipesHexa: () => unknown }>;
  let userContext: UserContext;
  let toolHandler: (params: {
    slug: string;
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
        if (name === 'get_command_details') {
          toolHandler = handler;
        }
      }),
    } as unknown as McpServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerGetCommandDetailsTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'get_command_details',
      'Get the full content of a command by its slug.',
      expect.any(Object),
      expect.any(Function),
    );
  });

  describe('when command exists', () => {
    let result: { content: { type: string; text: string }[] };

    beforeEach(async () => {
      const mockCommand = {
        slug: 'test-command',
        name: 'Test Command',
        version: 1,
        content: '## Steps\n\n1. Step one\n2. Step two',
      };

      const mockCommandsAdapter = {
        findRecipeBySlug: jest.fn().mockResolvedValue(mockCommand),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockCommandsAdapter,
      });

      registerGetCommandDetailsTool(dependencies, mcpServer);

      result = await toolHandler({ slug: 'test-command' });
    });

    it('includes command name in response', () => {
      expect(result.content[0].text).toContain('# Test Command');
    });

    it('includes slug in response', () => {
      expect(result.content[0].text).toContain('**Slug:** test-command');
    });

    it('includes version in response', () => {
      expect(result.content[0].text).toContain('**Version:** 1');
    });

    it('includes section headers from content', () => {
      expect(result.content[0].text).toContain('## Steps');
    });

    it('includes step details from content', () => {
      expect(result.content[0].text).toContain('1. Step one');
    });
  });

  describe('when command does not exist', () => {
    it('returns not found message', async () => {
      const mockCommandsAdapter = {
        findRecipeBySlug: jest.fn().mockResolvedValue(null),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockCommandsAdapter,
      });

      registerGetCommandDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ slug: 'non-existent' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Command with slug 'non-existent' not found in your organization",
          },
        ],
      });
    });
  });

  it('tracks analytics event on success', async () => {
    const mockCommand = {
      slug: 'test-command',
      name: 'Test Command',
      version: 1,
      content: 'Command content',
    };

    const mockCommandsAdapter = {
      findRecipeBySlug: jest.fn().mockResolvedValue(mockCommand),
    };

    mockFastify.recipesHexa.mockReturnValue({
      getAdapter: () => mockCommandsAdapter,
    });

    registerGetCommandDetailsTool(dependencies, mcpServer);

    await toolHandler({ slug: 'test-command' });

    expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
      'user-123',
      'org-123',
      'mcp_tool_call',
      { tool: 'get_command_details', slug: 'test-command' },
    );
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerGetCommandDetailsTool(dependencies, mcpServer);

      await expect(toolHandler({ slug: 'test-command' })).rejects.toThrow(
        'User context is required to get command by slug',
      );
    });
  });

  describe('when adapter throws error', () => {
    it('returns error message', async () => {
      const mockCommandsAdapter = {
        findRecipeBySlug: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockCommandsAdapter,
      });

      registerGetCommandDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ slug: 'test-command' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get command: Database error',
          },
        ],
      });
    });
  });

  describe('when command has empty content', () => {
    let result: { content: { type: string; text: string }[] };

    beforeEach(async () => {
      const mockCommand = {
        slug: 'empty-command',
        name: 'Empty Command',
        version: 1,
        content: '',
      };

      const mockCommandsAdapter = {
        findRecipeBySlug: jest.fn().mockResolvedValue(mockCommand),
      };

      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockCommandsAdapter,
      });

      registerGetCommandDetailsTool(dependencies, mcpServer);

      result = await toolHandler({ slug: 'empty-command' });
    });

    it('includes command name in response', () => {
      expect(result.content[0].text).toContain('# Empty Command');
    });

    it('includes slug in response', () => {
      expect(result.content[0].text).toContain('**Slug:** empty-command');
    });
  });
});
