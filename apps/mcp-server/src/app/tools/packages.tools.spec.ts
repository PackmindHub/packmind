import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerListPackagesTool } from './listPackages/listPackages.tool';
import { registerShowPackageTool } from './showPackage/showPackage.tool';
import { ToolDependencies, UserContext } from './types';

describe('packages.tools', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockLogger: ReturnType<typeof stubLogger>;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ deploymentsHexa: () => unknown }>;
  let userContext: UserContext;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listPackages', () => {
    let toolHandler: () => Promise<{
      content: { type: string; text: string }[];
    }>;

    beforeEach(() => {
      (mcpServer.tool as jest.Mock).mockImplementation(
        (name, description, schema, handler) => {
          if (name === 'list_packages') {
            toolHandler = handler;
          }
        },
      );
    });

    it('registers the tool with correct name and description', () => {
      registerListPackagesTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'list_packages',
        'Get a list of all available packages in Packmind. Packages are collections of commands and standards that can be pulled together.',
        {},
        expect.any(Function),
      );
    });

    it('returns formatted list of packages sorted by slug', async () => {
      const mockAdapter = {
        listPackages: jest.fn().mockResolvedValue({
          packages: [
            { slug: 'pkg-b', name: 'Package B', description: 'Description B' },
            { slug: 'pkg-a', name: 'Package A', description: 'Description A' },
          ],
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerListPackagesTool(dependencies, mcpServer);

      const result = await toolHandler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '• pkg-a: Description A\n• pkg-b: Description B',
          },
        ],
      });
    });

    describe('when description is missing', () => {
      it('uses package name', async () => {
        const mockAdapter = {
          listPackages: jest.fn().mockResolvedValue({
            packages: [{ slug: 'pkg-a', name: 'Package A', description: null }],
          }),
        };

        mockFastify.deploymentsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerListPackagesTool(dependencies, mcpServer);

        const result = await toolHandler();

        expect(result.content[0].text).toContain('• pkg-a: Package A');
      });
    });

    describe('when no packages found', () => {
      it('returns message', async () => {
        const mockAdapter = {
          listPackages: jest.fn().mockResolvedValue({
            packages: [],
          }),
        };

        mockFastify.deploymentsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerListPackagesTool(dependencies, mcpServer);

        const result = await toolHandler();

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'No packages found for your organization',
            },
          ],
        });
      });
    });

    it('tracks analytics event on success', async () => {
      const mockAdapter = {
        listPackages: jest.fn().mockResolvedValue({
          packages: [
            { slug: 'pkg-a', name: 'Package A', description: 'Desc A' },
          ],
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerListPackagesTool(dependencies, mcpServer);

      await toolHandler();

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        { tool: 'list_packages' },
      );
    });

    describe('when user context is missing', () => {
      it('throws error', async () => {
        dependencies.userContext = undefined;

        registerListPackagesTool(dependencies, mcpServer);

        await expect(toolHandler()).rejects.toThrow(
          'User context is required to list packages',
        );
      });
    });

    describe('when deploymentsHexa is not available', () => {
      it('returns error message', async () => {
        mockFastify.deploymentsHexa.mockReturnValue(null);

        registerListPackagesTool(dependencies, mcpServer);

        const result = await toolHandler();

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to list packages: DeploymentsHexa not available',
            },
          ],
        });
      });
    });

    describe('when adapter throws error', () => {
      it('returns error message', async () => {
        const mockAdapter = {
          listPackages: jest
            .fn()
            .mockRejectedValue(new Error('Database error')),
        };

        mockFastify.deploymentsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerListPackagesTool(dependencies, mcpServer);

        const result = await toolHandler();

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to list packages: Database error',
            },
          ],
        });
      });
    });
  });

  describe('showPackage', () => {
    let toolHandler: (params: {
      packageSlug: string;
    }) => Promise<{ content: { type: string; text: string }[] }>;

    beforeEach(() => {
      (mcpServer.tool as jest.Mock).mockImplementation(
        (name, description, schema, handler) => {
          if (name === 'get_package_details') {
            toolHandler = handler;
          }
        },
      );
    });

    it('registers the tool with correct name and description', () => {
      registerShowPackageTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'get_package_details',
        'Get detailed information about a specific package including its commands and standards.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    describe('when package has commands and standards', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        const mockAdapter = {
          getPackageSummary: jest.fn().mockResolvedValue({
            name: 'Test Package',
            slug: 'test-pkg',
            description: 'A test package',
            recipes: [
              { name: 'Command 1', summary: undefined },
              { name: 'Command 2', summary: undefined },
            ],
            standards: [
              { name: 'Standard 1', summary: 'Summary 1' },
              { name: 'Standard 2', summary: 'Summary 2' },
            ],
          }),
        };

        mockFastify.deploymentsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerShowPackageTool(dependencies, mcpServer);

        result = await toolHandler({ packageSlug: 'test-pkg' });
      });

      it('includes package title', () => {
        expect(result.content[0].text).toContain('# Test Package');
      });

      it('includes package description', () => {
        expect(result.content[0].text).toContain('A test package');
      });

      it('includes commands section', () => {
        expect(result.content[0].text).toContain('## Commands');
      });

      it('includes first command', () => {
        expect(result.content[0].text).toContain('• Command 1');
      });

      it('includes second command', () => {
        expect(result.content[0].text).toContain('• Command 2');
      });

      it('includes standards section', () => {
        expect(result.content[0].text).toContain('## Standards');
      });

      it('includes first standard with summary', () => {
        expect(result.content[0].text).toContain('• Standard 1: Summary 1');
      });

      it('includes second standard with summary', () => {
        expect(result.content[0].text).toContain('• Standard 2: Summary 2');
      });
    });

    describe('when standards have no summary', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        const mockAdapter = {
          getPackageSummary: jest.fn().mockResolvedValue({
            name: 'Test Package',
            slug: 'test-pkg',
            description: 'A test package',
            recipes: [],
            standards: [
              { name: 'Standard With Summary', summary: 'This has a summary' },
              { name: 'Standard Without Summary', summary: undefined },
            ],
          }),
        };

        mockFastify.deploymentsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerShowPackageTool(dependencies, mcpServer);

        result = await toolHandler({ packageSlug: 'test-pkg' });
      });

      it('includes standard with summary and its summary text', () => {
        expect(result.content[0].text).toContain(
          '• Standard With Summary: This has a summary',
        );
      });

      it('includes standard without summary', () => {
        expect(result.content[0].text).toContain('• Standard Without Summary');
      });

      it('omits colon for standard without summary', () => {
        expect(result.content[0].text).not.toContain(
          '• Standard Without Summary:',
        );
      });
    });

    describe('when package has no commands or standards', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        const mockAdapter = {
          getPackageSummary: jest.fn().mockResolvedValue({
            name: 'Empty Package',
            slug: 'empty-pkg',
            description: 'An empty package',
            recipes: [],
            standards: [],
          }),
        };

        mockFastify.deploymentsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerShowPackageTool(dependencies, mcpServer);

        result = await toolHandler({ packageSlug: 'empty-pkg' });
      });

      it('includes package title', () => {
        expect(result.content[0].text).toContain('# Empty Package');
      });

      it('includes package description', () => {
        expect(result.content[0].text).toContain('An empty package');
      });

      it('omits commands section', () => {
        expect(result.content[0].text).not.toContain('## Commands');
      });

      it('omits standards section', () => {
        expect(result.content[0].text).not.toContain('## Standards');
      });
    });

    it('tracks analytics event on success', async () => {
      const mockAdapter = {
        getPackageSummary: jest.fn().mockResolvedValue({
          name: 'Test Package',
          slug: 'test-pkg',
          description: 'A test package',
          recipes: [],
          standards: [],
        }),
      };

      mockFastify.deploymentsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerShowPackageTool(dependencies, mcpServer);

      await toolHandler({ packageSlug: 'test-pkg' });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        { tool: 'get_package_details', packageSlug: 'test-pkg' },
      );
    });

    describe('when user context is missing', () => {
      it('throws error', async () => {
        dependencies.userContext = undefined;

        registerShowPackageTool(dependencies, mcpServer);

        await expect(toolHandler({ packageSlug: 'test-pkg' })).rejects.toThrow(
          'User context is required to show package details',
        );
      });
    });

    describe('when deploymentsHexa is not available', () => {
      it('returns error message', async () => {
        mockFastify.deploymentsHexa.mockReturnValue(null);

        registerShowPackageTool(dependencies, mcpServer);

        const result = await toolHandler({ packageSlug: 'test-pkg' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to get package details: DeploymentsHexa not available',
            },
          ],
        });
      });
    });

    describe('when package not found', () => {
      it('returns error message', async () => {
        const mockAdapter = {
          getPackageSummary: jest
            .fn()
            .mockRejectedValue(new Error("Package 'test-pkg' does not exist")),
        };

        mockFastify.deploymentsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerShowPackageTool(dependencies, mcpServer);

        const result = await toolHandler({ packageSlug: 'test-pkg' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: "Failed to get package details: Package 'test-pkg' does not exist",
            },
          ],
        });
      });
    });
  });
});
