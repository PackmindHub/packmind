import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import {
  IEventTrackingPort,
  ProgrammingLanguage,
  Space,
} from '@packmind/types';
import * as nodeUtils from '@packmind/node-utils';
import * as types from '@packmind/types';
import { registerCreateStandardTool } from './createStandard.tool';
import { ToolDependencies, UserContext } from './types';
import * as utils from './utils';

jest.mock('@packmind/node-utils');
jest.mock('./utils');
jest.mock('@packmind/types', () => ({
  ...jest.requireActual('@packmind/types'),
  stringToProgrammingLanguage: jest.fn(),
}));

describe('createStandard.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{
    standardsHexa: () => unknown;
    spacesHexa: () => unknown;
  }>;
  let userContext: UserContext;
  let mockStandardsAdapter: jest.Mocked<{
    createStandardWithExamples: jest.Mock;
  }>;
  let mockLogger: ReturnType<typeof stubLogger>;
  let toolHandler: (params: {
    name: string;
    description: string;
    summary?: string;
    rules?: Array<{
      content: string;
      examples?: Array<{
        positive: string;
        negative: string;
        language: string;
      }>;
    }>;
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

    mockStandardsAdapter = {
      createStandardWithExamples: jest.fn(),
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
      tool: jest.fn(),
    } as unknown as McpServer;

    (mcpServer.tool as jest.Mock).mockImplementation(
      (name, description, schema, handler) => {
        if (name === 'packmind_create_standard') {
          toolHandler = handler;
        }
      },
    );

    // Mock extractCodeFromMarkdown to return the input as-is by default
    (nodeUtils.extractCodeFromMarkdown as jest.Mock).mockImplementation(
      (code: string) => code,
    );

    // Mock getGlobalSpace to return a mock space
    (utils.getGlobalSpace as jest.Mock).mockResolvedValue({
      id: 'space-123',
      name: 'Global Space',
    } as Space);

    // Mock stringToProgrammingLanguage to return enum values for valid languages
    (types.stringToProgrammingLanguage as jest.Mock).mockImplementation(
      (lang: string) => {
        const lowerLang = lang.toLowerCase();
        if (lowerLang === 'typescript') return ProgrammingLanguage.TYPESCRIPT;
        if (lowerLang === 'javascript') return ProgrammingLanguage.JAVASCRIPT;
        if (lowerLang === 'python') return ProgrammingLanguage.PYTHON;
        throw new Error(`Unknown programming language: "${lang}"`);
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerCreateStandardTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'packmind_create_standard',
      'Create a new coding standard with multiple rules and optional examples in a single operation. Do not call this tool directly—you need to first use the tool standard_creation_workflow',
      expect.any(Object),
      expect.any(Function),
    );
  });

  describe('success scenarios', () => {
    it('creates standard with name, description, summary, and rules with examples', async () => {
      const mockStandard = {
        slug: 'test-standard',
        name: 'Test Standard',
      };

      mockStandardsAdapter.createStandardWithExamples.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({
        name: 'Test Standard',
        description: 'A comprehensive test standard',
        summary: 'Use this for testing',
        rules: [
          {
            content: 'Use TypeScript for type safety',
            examples: [
              {
                positive: 'const x: number = 5;',
                negative: 'const x = 5;',
                language: 'typescript',
              },
            ],
          },
          {
            content: 'Write unit tests for all functions',
            examples: [
              {
                positive: 'test("should add", () => {})',
                negative: '// No tests',
                language: 'typescript',
              },
            ],
          },
        ],
      });

      expect(
        mockStandardsAdapter.createStandardWithExamples,
      ).toHaveBeenCalledWith({
        name: 'Test Standard',
        description: 'A comprehensive test standard',
        summary: 'Use this for testing',
        rules: [
          {
            content: 'Use TypeScript for type safety',
            examples: [
              {
                positive: 'const x: number = 5;',
                negative: 'const x = 5;',
                language: ProgrammingLanguage.TYPESCRIPT,
              },
            ],
          },
          {
            content: 'Write unit tests for all functions',
            examples: [
              {
                positive: 'test("should add", () => {})',
                negative: '// No tests',
                language: ProgrammingLanguage.TYPESCRIPT,
              },
            ],
          },
        ],
        organizationId: 'org-123',
        userId: 'user-123',
        scope: null,
        spaceId: 'space-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Standard 'test-standard' has been created successfully with 2 rules and 2 examples.",
          },
        ],
      });
    });

    it('creates standard without rules', async () => {
      const mockStandard = {
        slug: 'empty-standard',
        name: 'Empty Standard',
      };

      mockStandardsAdapter.createStandardWithExamples.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({
        name: 'Empty Standard',
        description: 'A standard without rules',
      });

      expect(
        mockStandardsAdapter.createStandardWithExamples,
      ).toHaveBeenCalledWith({
        name: 'Empty Standard',
        description: 'A standard without rules',
        summary: null,
        rules: [],
        organizationId: 'org-123',
        userId: 'user-123',
        scope: null,
        spaceId: 'space-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Standard 'empty-standard' has been created successfully with 0 rules and 0 examples.",
          },
        ],
      });
    });

    it('creates standard without summary (optional field)', async () => {
      const mockStandard = {
        slug: 'no-summary-standard',
        name: 'No Summary Standard',
      };

      mockStandardsAdapter.createStandardWithExamples.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({
        name: 'No Summary Standard',
        description: 'A standard without summary',
        rules: [
          {
            content: 'Always write clean code',
          },
        ],
      });

      expect(
        mockStandardsAdapter.createStandardWithExamples,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: null,
        }),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Standard 'no-summary-standard' has been created successfully with 1 rules and 0 examples.",
          },
        ],
      });
    });
  });

  describe('invalid programming language handling', () => {
    describe('when invalid programming language is provided', () => {
      it('returns error', async () => {
        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockStandardsAdapter,
        });

        registerCreateStandardTool(dependencies, mcpServer);

        const result = await toolHandler({
          name: 'Standard With Invalid Lang',
          description: 'Testing invalid language handling',
          rules: [
            {
              content: 'Use proper syntax',
              examples: [
                {
                  positive: 'valid code',
                  negative: 'invalid code',
                  language: 'invalid-language',
                },
              ],
            },
          ],
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to create standard: Unknown programming language: "invalid-language"',
            },
          ],
        });

        expect(
          mockStandardsAdapter.createStandardWithExamples,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('extractCodeFromMarkdown usage', () => {
    it('uses extractCodeFromMarkdown on examples', async () => {
      const mockStandard = {
        slug: 'markdown-test-standard',
        name: 'Markdown Test Standard',
      };

      mockStandardsAdapter.createStandardWithExamples.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      (nodeUtils.extractCodeFromMarkdown as jest.Mock)
        .mockReturnValueOnce('extracted positive code')
        .mockReturnValueOnce('extracted negative code');

      registerCreateStandardTool(dependencies, mcpServer);

      await toolHandler({
        name: 'Markdown Test Standard',
        description: 'Testing markdown extraction',
        rules: [
          {
            content: 'Test rule',
            examples: [
              {
                positive: '```typescript\nconst x = 5;\n```',
                negative: '```typescript\nvar x = 5;\n```',
                language: 'typescript',
              },
            ],
          },
        ],
      });

      expect(nodeUtils.extractCodeFromMarkdown).toHaveBeenCalledWith(
        '```typescript\nconst x = 5;\n```',
      );
      expect(nodeUtils.extractCodeFromMarkdown).toHaveBeenCalledWith(
        '```typescript\nvar x = 5;\n```',
      );

      expect(
        mockStandardsAdapter.createStandardWithExamples,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: [
            {
              content: 'Test rule',
              examples: [
                {
                  positive: 'extracted positive code',
                  negative: 'extracted negative code',
                  language: ProgrammingLanguage.TYPESCRIPT,
                },
              ],
            },
          ],
        }),
      );
    });
  });

  describe('analytics tracking', () => {
    it('tracks analytics event on success', async () => {
      const mockStandard = {
        slug: 'analytics-test-standard',
        name: 'Analytics Test Standard',
      };

      mockStandardsAdapter.createStandardWithExamples.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerCreateStandardTool(dependencies, mcpServer);

      await toolHandler({
        name: 'Analytics Test Standard',
        description: 'Testing analytics',
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        { tool: 'packmind_create_standard' },
      );
    });
  });

  describe('error handling', () => {
    describe('when user context is missing', () => {
      it('throws error', async () => {
        dependencies.userContext = undefined;

        registerCreateStandardTool(dependencies, mcpServer);

        await expect(
          toolHandler({
            name: 'Test Standard',
            description: 'Test description',
          }),
        ).rejects.toThrow('User context is required to create standards');
      });
    });

    describe('when adapter throws error', () => {
      it('returns error message', async () => {
        mockStandardsAdapter.createStandardWithExamples.mockRejectedValue(
          new Error('Database connection failed'),
        );

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockStandardsAdapter,
        });

        registerCreateStandardTool(dependencies, mcpServer);

        const result = await toolHandler({
          name: 'Test Standard',
          description: 'Test description',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to create standard: Database connection failed',
            },
          ],
        });
      });
    });

    describe('when adapter throws non-Error object', () => {
      it('returns error message', async () => {
        mockStandardsAdapter.createStandardWithExamples.mockRejectedValue(
          'String error',
        );

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockStandardsAdapter,
        });

        registerCreateStandardTool(dependencies, mcpServer);

        const result = await toolHandler({
          name: 'Test Standard',
          description: 'Test description',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to create standard: String error',
            },
          ],
        });
      });
    });
  });

  describe('getGlobalSpace usage', () => {
    it('uses global space via getGlobalSpace', async () => {
      const mockStandard = {
        slug: 'space-test-standard',
        name: 'Space Test Standard',
      };

      mockStandardsAdapter.createStandardWithExamples.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      const mockSpace: Space = {
        id: 'custom-space-456',
        name: 'Custom Global Space',
      } as Space;

      (utils.getGlobalSpace as jest.Mock).mockResolvedValue(mockSpace);

      registerCreateStandardTool(dependencies, mcpServer);

      await toolHandler({
        name: 'Space Test Standard',
        description: 'Testing space usage',
      });

      expect(utils.getGlobalSpace).toHaveBeenCalledWith(mockFastify, 'org-123');

      expect(
        mockStandardsAdapter.createStandardWithExamples,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'custom-space-456',
        }),
      );
    });
  });
});
