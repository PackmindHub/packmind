import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerListStandardsTool } from './listStandards.tool';
import { ToolDependencies, UserContext } from './types';

describe('listStandards.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{
    standardsHexa: () => unknown;
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
      standardsHexa: jest.fn(),
      spacesHexa: jest.fn(),
    } as unknown as jest.Mocked<{
      standardsHexa: () => unknown;
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
        if (name === 'packmind_list_standards') {
          toolHandler = handler;
        }
      }),
    } as unknown as McpServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerListStandardsTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'packmind_list_standards',
      'Get a list of current standards in Packmind.',
      {},
      expect.any(Function),
    );
  });

  it('returns formatted list of standards sorted by slug', async () => {
    const mockStandardsAdapter = {
      listStandardsBySpace: jest.fn().mockResolvedValue([
        { slug: 'standard-b', name: 'Standard B' },
        { slug: 'standard-a', name: 'Standard A' },
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

    mockFastify.standardsHexa.mockReturnValue({
      getAdapter: () => mockStandardsAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListStandardsTool(dependencies, mcpServer);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: '• standard-a: Standard A\n• standard-b: Standard B',
        },
      ],
    });
  });

  it('limits results to 20 standards', async () => {
    const mockStandards = Array.from({ length: 25 }, (_, i) => ({
      slug: `standard-${i.toString().padStart(2, '0')}`,
      name: `Standard ${i}`,
    }));

    const mockStandardsAdapter = {
      listStandardsBySpace: jest.fn().mockResolvedValue(mockStandards),
    };

    const mockSpacesAdapter = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([
        {
          id: 'space-1',
          name: 'Global Space',
        },
      ]),
    };

    mockFastify.standardsHexa.mockReturnValue({
      getAdapter: () => mockStandardsAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListStandardsTool(dependencies, mcpServer);

    const result = await toolHandler();

    const lines = result.content[0].text.split('\n');
    expect(lines).toHaveLength(20);
  });

  describe('when no standards found', () => {
    it('returns message', async () => {
      const mockStandardsAdapter = {
        listStandardsBySpace: jest.fn().mockResolvedValue([]),
      };

      const mockSpacesAdapter = {
        listSpacesByOrganization: jest.fn().mockResolvedValue([
          {
            id: 'space-1',
            name: 'Global Space',
          },
        ]),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      mockFastify.spacesHexa.mockReturnValue({
        getAdapter: () => mockSpacesAdapter,
      });

      registerListStandardsTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No standards found for your organization',
          },
        ],
      });
    });
  });

  it('tracks analytics event on success', async () => {
    const mockStandardsAdapter = {
      listStandardsBySpace: jest
        .fn()
        .mockResolvedValue([{ slug: 'standard-a', name: 'Standard A' }]),
    };

    const mockSpacesAdapter = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([
        {
          id: 'space-1',
          name: 'Global Space',
        },
      ]),
    };

    mockFastify.standardsHexa.mockReturnValue({
      getAdapter: () => mockStandardsAdapter,
    });

    mockFastify.spacesHexa.mockReturnValue({
      getAdapter: () => mockSpacesAdapter,
    });

    registerListStandardsTool(dependencies, mcpServer);

    await toolHandler();

    expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
      'user-123',
      'org-123',
      'mcp_tool_call',
      { tool: 'packmind_list_standards' },
    );
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerListStandardsTool(dependencies, mcpServer);

      await expect(toolHandler()).rejects.toThrow(
        'User context is required to list standards',
      );
    });
  });

  describe('when adapter throws error', () => {
    it('returns error message', async () => {
      const mockStandardsAdapter = {
        listStandardsBySpace: jest
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

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      mockFastify.spacesHexa.mockReturnValue({
        getAdapter: () => mockSpacesAdapter,
      });

      registerListStandardsTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list standards: Database error',
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

      registerListStandardsTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list standards: Space not found',
          },
        ],
      });
    });
  });
});
