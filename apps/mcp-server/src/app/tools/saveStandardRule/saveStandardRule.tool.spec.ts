import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort, Space } from '@packmind/types';
import { registerSaveStandardRuleTool } from './saveStandardRule.tool';
import { ToolDependencies, UserContext } from '../types';
import * as utils from '../utils';

jest.mock('@packmind/node-utils', () => ({
  extractCodeFromMarkdown: jest.fn((code: string) => code),
}));
jest.mock('../utils');

describe('addRuleToStandard.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{
    standardsHexa: () => unknown;
    accountsHexa: () => unknown;
  }>;
  let userContext: UserContext;
  let mockAccountsAdapter: jest.Mocked<{
    getUserById: jest.Mock;
  }>;
  let mockLogger: ReturnType<typeof stubLogger>;

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

    mockAccountsAdapter = {
      getUserById: jest.fn(),
    };

    // Default: return a user
    mockAccountsAdapter.getUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
    });

    mockFastify = {
      standardsHexa: jest.fn(),
      accountsHexa: jest.fn().mockReturnValue({
        getAdapter: () => mockAccountsAdapter,
      }),
    } as unknown as jest.Mocked<{
      standardsHexa: () => unknown;
      accountsHexa: () => unknown;
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

    // Mock getGlobalSpace to return a mock space
    (utils.getGlobalSpace as jest.Mock).mockResolvedValue({
      id: 'space-123',
      name: 'Global Space',
    } as Space);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset the extractCodeFromMarkdown mock to default behavior
    const { extractCodeFromMarkdown } = jest.requireMock(
      '@packmind/node-utils',
    );
    extractCodeFromMarkdown.mockImplementation((code: string) => code);
  });

  describe('addRuleToStandard', () => {
    let toolHandler: (params: {
      standardSlug: string;
      ruleContent: string;
      positiveExample?: string;
      negativeExample?: string;
      language?: string;
    }) => Promise<{ content: { type: string; text: string }[] }>;

    beforeEach(() => {
      (mcpServer.tool as jest.Mock).mockImplementation(
        (name, description, schema, handler) => {
          if (name === 'save_standard_rule') {
            toolHandler = handler;
          }
        },
      );
    });

    it('registers the tool with correct name and description', () => {
      registerSaveStandardRuleTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'save_standard_rule',
        'Add a new coding rule to an existing standard identified by its slug. Do not call this tool directly—you need to first use the tool packmind_create_standard_rule.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    describe('when adding rule with standardSlug and ruleContent', () => {
      let mockAdapter: { addRuleToStandard: jest.Mock };
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        result = await toolHandler({
          standardSlug: 'typescript-best-practices',
          ruleContent: 'Use meaningful variable names',
        });
      });

      it('calls addRuleToStandard with correct parameters', () => {
        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith({
          standardSlug: 'typescript-best-practices',
          ruleContent: 'Use meaningful variable names',
          organizationId: 'org-123',
          userId: 'user-123',
          spaceId: 'space-123',
          examples: [],
          source: 'mcp',
        });
      });

      it('returns success message with new version', () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: "Rule added successfully to standard 'typescript-best-practices'. New version 1.1.0 created.",
            },
          ],
        });
      });
    });

    describe('when adding rule with positive and negative examples and language', () => {
      let mockAdapter: { addRuleToStandard: jest.Mock };
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        const { extractCodeFromMarkdown } = jest.requireMock(
          '@packmind/node-utils',
        );
        extractCodeFromMarkdown.mockImplementation((code: string) =>
          code.replace(/```typescript\n|\n```/g, ''),
        );

        mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        result = await toolHandler({
          standardSlug: 'typescript-best-practices',
          ruleContent: 'Use const for immutable variables',
          positiveExample: '```typescript\nconst PI = 3.14;\n```',
          negativeExample: '```typescript\nlet PI = 3.14;\n```',
          language: 'typescript',
        });
      });

      it('calls addRuleToStandard with extracted examples', () => {
        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith({
          standardSlug: 'typescript-best-practices',
          ruleContent: 'Use const for immutable variables',
          organizationId: 'org-123',
          userId: 'user-123',
          spaceId: 'space-123',
          examples: [
            {
              positive: 'const PI = 3.14;',
              negative: 'let PI = 3.14;',
              language: 'TYPESCRIPT',
            },
          ],
          source: 'mcp',
        });
      });

      it('returns success message with new version', () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: "Rule added successfully to standard 'typescript-best-practices'. New version 1.1.0 created.",
            },
          ],
        });
      });
    });

    describe('when standardSlug has uppercase characters', () => {
      let mockAdapter: { addRuleToStandard: jest.Mock };
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.2.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        result = await toolHandler({
          standardSlug: 'TypeScript-Best-Practices',
          ruleContent: 'Follow naming conventions',
        });
      });

      it('passes lowercase standardSlug to adapter', () => {
        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith({
          standardSlug: 'typescript-best-practices',
          ruleContent: 'Follow naming conventions',
          organizationId: 'org-123',
          userId: 'user-123',
          spaceId: 'space-123',
          examples: [],
          source: 'mcp',
        });
      });

      it('returns success message with lowercase slug', () => {
        expect(result.content[0].text).toContain('typescript-best-practices');
      });
    });

    describe('when examples are provided as markdown code blocks', () => {
      let extractCodeFromMarkdown: jest.Mock;
      let mockAdapter: { addRuleToStandard: jest.Mock };

      beforeEach(async () => {
        extractCodeFromMarkdown = jest.requireMock(
          '@packmind/node-utils',
        ).extractCodeFromMarkdown;
        extractCodeFromMarkdown.mockImplementation((code: string) =>
          code ? 'extracted: ' + code : '',
        );

        mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
          positiveExample: '```js\nconst x = 1;\n```',
          negativeExample: '```js\nvar x = 1;\n```',
          language: 'javascript',
        });
      });

      it('calls extractCodeFromMarkdown for positive example', () => {
        expect(extractCodeFromMarkdown).toHaveBeenCalledWith(
          '```js\nconst x = 1;\n```',
        );
      });

      it('calls extractCodeFromMarkdown for negative example', () => {
        expect(extractCodeFromMarkdown).toHaveBeenCalledWith(
          '```js\nvar x = 1;\n```',
        );
      });

      it('passes extracted code to addRuleToStandard', () => {
        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith(
          expect.objectContaining({
            examples: [
              expect.objectContaining({
                positive: 'extracted: ```js\nconst x = 1;\n```',
                negative: 'extracted: ```js\nvar x = 1;\n```',
              }),
            ],
          }),
        );
      });
    });

    it('tracks analytics event on success', async () => {
      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardVersion: {
            standardId: 'standard-123',
            version: '1.1.0',
          },
        }),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerSaveStandardRuleTool(dependencies, mcpServer);

      await toolHandler({
        standardSlug: 'test-standard',
        ruleContent: 'Test rule',
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        { tool: 'save_standard_rule' },
      );
    });

    describe('when user context is missing', () => {
      it('throws error', async () => {
        dependencies.userContext = undefined;

        registerSaveStandardRuleTool(dependencies, mcpServer);

        await expect(
          toolHandler({
            standardSlug: 'test-standard',
            ruleContent: 'Test rule',
          }),
        ).rejects.toThrow('User context is required to add rules to standards');
      });
    });

    describe('when adapter throws error', () => {
      it('returns error message', async () => {
        const mockAdapter = {
          addRuleToStandard: jest
            .fn()
            .mockRejectedValue(new Error('Standard not found')),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        const result = await toolHandler({
          standardSlug: 'non-existent-standard',
          ruleContent: 'Test rule',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to add rule to standard: Standard not found',
            },
          ],
        });
      });
    });

    describe('when no code snippets provided', () => {
      it('passes empty examples array to addRuleToStandard', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
        });

        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith(
          expect.objectContaining({
            examples: [],
          }),
        );
      });
    });

    describe('when only positive example provided', () => {
      it('passes example with positive and empty negative to addRuleToStandard', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
          positiveExample: 'const x = 1;',
          language: 'javascript',
        });

        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith(
          expect.objectContaining({
            examples: [
              expect.objectContaining({
                positive: 'const x = 1;',
                negative: '',
              }),
            ],
          }),
        );
      });
    });

    describe('when only negative example provided', () => {
      it('passes example with empty positive and negative to addRuleToStandard', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
          negativeExample: 'var x = 1;',
          language: 'javascript',
        });

        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith(
          expect.objectContaining({
            examples: [
              expect.objectContaining({
                positive: '',
                negative: 'var x = 1;',
              }),
            ],
          }),
        );
      });
    });

    describe('when language is not provided with examples', () => {
      let mockAdapter: { addRuleToStandard: jest.Mock };
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        result = await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
          positiveExample: 'const x = 1;',
        });
      });

      it('defaults to JAVASCRIPT language', () => {
        expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith(
          expect.objectContaining({
            examples: [
              expect.objectContaining({
                positive: 'const x = 1;',
                language: 'JAVASCRIPT',
              }),
            ],
          }),
        );
      });

      it('returns success message', () => {
        expect(result.content[0].text).toContain('Rule added successfully');
      });
    });

    describe('when invalid language is provided', () => {
      let mockAdapter: { addRuleToStandard: jest.Mock };
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardVersion: {
              standardId: 'standard-123',
              version: '1.1.0',
            },
          }),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        result = await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
          positiveExample: 'const x = 1;',
          language: 'invalid-language',
        });
      });

      it('returns error message about unknown language', () => {
        expect(result.content[0].text).toContain(
          'Failed to add rule to standard: Unknown programming language',
        );
      });

      it('does not call addRuleToStandard', () => {
        expect(mockAdapter.addRuleToStandard).not.toHaveBeenCalled();
      });
    });

    it('handles empty string examples by passing empty examples array', async () => {
      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardVersion: {
            standardId: 'standard-123',
            version: '1.1.0',
          },
        }),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerSaveStandardRuleTool(dependencies, mcpServer);

      await toolHandler({
        standardSlug: 'test-standard',
        ruleContent: 'Test rule',
        positiveExample: '',
        negativeExample: '',
      });

      expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith(
        expect.objectContaining({
          examples: [],
        }),
      );
    });
  });
});
