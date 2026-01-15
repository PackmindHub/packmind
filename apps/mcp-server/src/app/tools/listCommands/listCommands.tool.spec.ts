import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerListCommandsTool } from './listCommands.tool';
import { ToolDependencies, UserContext } from '../types';

describe('listCommands.tool', () => {
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
        if (name === 'list_commands') {
          toolHandler = handler;
        }
      }),
    } as unknown as McpServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerListCommandsTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'list_commands',
      'Get a list of current commands in Packmind.',
      {},
      expect.any(Function),
    );
  });

  it('returns formatted list of commands sorted by slug', async () => {
    const mockCommandsAdapter = {
      listRecipesBySpace: jest.fn().mockResolvedValue([
        { slug: 'command-b', name: 'Command B' },
        { slug: 'command-a', name: 'Command A' },
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
      getAdapter: () => mockCommandsAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListCommandsTool(dependencies, mcpServer);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: '• command-a: Command A\n• command-b: Command B',
        },
      ],
    });
  });

  it('limits results to 20 commands', async () => {
    const mockCommands = Array.from({ length: 25 }, (_, i) => ({
      slug: `command-${i.toString().padStart(2, '0')}`,
      name: `Command ${i}`,
    }));

    const mockCommandsAdapter = {
      listRecipesBySpace: jest.fn().mockResolvedValue(mockCommands),
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
      getAdapter: () => mockCommandsAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListCommandsTool(dependencies, mcpServer);

    const result = await toolHandler();

    const lines = result.content[0].text.split('\n');
    expect(lines).toHaveLength(20);
  });

  describe('when no commands found', () => {
    it('returns message', async () => {
      const mockCommandsAdapter = {
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
        getAdapter: () => mockCommandsAdapter,
      });

      mockFastify.spacesHexa.mockReturnValue({
        getAdapter: () => mockSpacesAdapter,
      });

      registerListCommandsTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No commands found for your organization',
          },
        ],
      });
    });
  });

  it('tracks analytics event on success', async () => {
    const mockCommandsAdapter = {
      listRecipesBySpace: jest
        .fn()
        .mockResolvedValue([{ slug: 'command-a', name: 'Command A' }]),
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
      getAdapter: () => mockCommandsAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListCommandsTool(dependencies, mcpServer);

    await toolHandler();

    expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
      'user-123',
      'org-123',
      'mcp_tool_call',
      { tool: 'list_commands' },
    );
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerListCommandsTool(dependencies, mcpServer);

      await expect(toolHandler()).rejects.toThrow(
        'User context is required to list commands',
      );
    });
  });

  describe('when adapter throws error', () => {
    it('returns error message', async () => {
      const mockCommandsAdapter = {
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
        getAdapter: () => mockCommandsAdapter,
      });

      mockFastify.spacesHexa.mockReturnValue({
        getAdapter: () => mockSpacesAdapter,
      });

      registerListCommandsTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list commands: Database error',
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

      registerListCommandsTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list commands: Space not found',
          },
        ],
      });
    });
  });
});
