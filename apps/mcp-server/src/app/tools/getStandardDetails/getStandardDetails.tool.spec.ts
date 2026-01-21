import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerGetStandardDetailsTool } from './getStandardDetails.tool';
import { ToolDependencies, UserContext } from '../types';

describe('getStandardDetails.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ standardsHexa: () => unknown }>;
  let userContext: UserContext;
  let toolHandler: (params: {
    standardSlug: string;
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
      standardsHexa: jest.fn(),
    } as unknown as jest.Mocked<{ standardsHexa: () => unknown }>;

    dependencies = {
      fastify: mockFastify as unknown as ToolDependencies['fastify'],
      userContext,
      analyticsAdapter: mockAnalyticsAdapter,
      logger: mockLogger,
      mcpToolPrefix: 'packmind',
    };

    mcpServer = {
      tool: jest.fn((name, description, schema, handler) => {
        if (name === 'get_standard_details') {
          toolHandler = handler;
        }
      }),
    } as unknown as McpServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerGetStandardDetailsTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'get_standard_details',
      'Get the full content of a standard including its rules and examples by its slug.',
      expect.any(Object),
      expect.any(Function),
    );
  });

  describe('when standard has rules and examples', () => {
    let resultText: string;

    beforeEach(async () => {
      const mockStandard = {
        id: 'std-123',
        slug: 'test-standard',
        name: 'Test Standard',
        version: 1,
        description: 'A test standard description',
      };

      const mockRules = [
        {
          id: 'rule-1',
          content: 'Always use TypeScript',
        },
      ];

      const mockExamples = [
        {
          lang: 'TypeScript',
          positive: 'const foo: string = "bar";',
          negative: 'const foo = "bar";',
        },
      ];

      const mockStandardsAdapter = {
        findStandardBySlug: jest.fn().mockResolvedValue(mockStandard),
        getRulesByStandardId: jest.fn().mockResolvedValue(mockRules),
        getRuleExamples: jest.fn().mockResolvedValue(mockExamples),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerGetStandardDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ standardSlug: 'test-standard' });
      resultText = result.content[0].text;
    });

    it('includes standard name as title', () => {
      expect(resultText).toContain('# Test Standard');
    });

    it('includes standard slug', () => {
      expect(resultText).toContain('**Slug:** test-standard');
    });

    it('includes standard version', () => {
      expect(resultText).toContain('**Version:** 1');
    });

    it('includes description section', () => {
      expect(resultText).toContain('## Description');
    });

    it('includes description content', () => {
      expect(resultText).toContain('A test standard description');
    });

    it('includes rules section', () => {
      expect(resultText).toContain('## Rules');
    });

    it('includes rule content as heading', () => {
      expect(resultText).toContain('### Rule: Always use TypeScript');
    });

    it('includes positive example label', () => {
      expect(resultText).toContain('**Positive Example (TypeScript):**');
    });

    it('includes code block with typescript language', () => {
      expect(resultText).toContain('```typescript');
    });

    it('includes positive example code', () => {
      expect(resultText).toContain('const foo: string = "bar";');
    });

    it('includes negative example label', () => {
      expect(resultText).toContain('**Negative Example (TypeScript):**');
    });

    it('includes negative example code', () => {
      expect(resultText).toContain('const foo = "bar";');
    });
  });

  describe('when standard has multiple rules and examples', () => {
    let resultText: string;
    let mockStandardsAdapter: {
      findStandardBySlug: jest.Mock;
      getRulesByStandardId: jest.Mock;
      getRuleExamples: jest.Mock;
    };

    beforeEach(async () => {
      const mockStandard = {
        id: 'std-456',
        slug: 'multi-rule-standard',
        name: 'Multi Rule Standard',
        version: 2,
        description: 'A standard with multiple rules',
      };

      const mockRules = [
        {
          id: 'rule-1',
          content: 'Use const for constants',
        },
        {
          id: 'rule-2',
          content: 'Prefer arrow functions',
        },
      ];

      const mockExamplesRule1 = [
        {
          lang: 'JavaScript',
          positive: 'const PI = 3.14;',
          negative: 'var PI = 3.14;',
        },
      ];

      const mockExamplesRule2 = [
        {
          lang: 'JavaScript',
          positive: 'const add = (a, b) => a + b;',
          negative: 'function add(a, b) { return a + b; }',
        },
      ];

      mockStandardsAdapter = {
        findStandardBySlug: jest.fn().mockResolvedValue(mockStandard),
        getRulesByStandardId: jest.fn().mockResolvedValue(mockRules),
        getRuleExamples: jest
          .fn()
          .mockResolvedValueOnce(mockExamplesRule1)
          .mockResolvedValueOnce(mockExamplesRule2),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerGetStandardDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ standardSlug: 'multi-rule-standard' });
      resultText = result.content[0].text;
    });

    it('includes first rule content', () => {
      expect(resultText).toContain('### Rule: Use const for constants');
    });

    it('includes second rule content', () => {
      expect(resultText).toContain('### Rule: Prefer arrow functions');
    });

    it('includes first rule example code', () => {
      expect(resultText).toContain('const PI = 3.14;');
    });

    it('includes second rule example code', () => {
      expect(resultText).toContain('const add = (a, b) => a + b;');
    });

    it('fetches examples for each rule', () => {
      expect(mockStandardsAdapter.getRuleExamples).toHaveBeenCalledTimes(2);
    });
  });

  describe('when standard does not exist', () => {
    it('returns not found message', async () => {
      const mockStandardsAdapter = {
        findStandardBySlug: jest.fn().mockResolvedValue(null),
        getRulesByStandardId: jest.fn(),
        getRuleExamples: jest.fn(),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerGetStandardDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ standardSlug: 'non-existent' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Standard with slug 'non-existent' not found in your organization",
          },
        ],
      });
    });
  });

  it('tracks analytics event on success with slug parameter', async () => {
    const mockStandard = {
      id: 'std-789',
      slug: 'analytics-test',
      name: 'Analytics Test Standard',
      version: 1,
      description: 'Testing analytics',
    };

    const mockStandardsAdapter = {
      findStandardBySlug: jest.fn().mockResolvedValue(mockStandard),
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
      getRuleExamples: jest.fn().mockResolvedValue([]),
    };

    mockFastify.standardsHexa.mockReturnValue({
      getAdapter: () => mockStandardsAdapter,
    });

    registerGetStandardDetailsTool(dependencies, mcpServer);

    await toolHandler({ standardSlug: 'analytics-test' });

    expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
      'user-123',
      'org-123',
      'mcp_tool_call',
      { tool: 'get_standard_details', standardSlug: 'analytics-test' },
    );
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerGetStandardDetailsTool(dependencies, mcpServer);

      await expect(
        toolHandler({ standardSlug: 'test-standard' }),
      ).rejects.toThrow('User context is required to get standard by slug');
    });
  });

  describe('when adapter throws error', () => {
    it('returns error message', async () => {
      const mockStandardsAdapter = {
        findStandardBySlug: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
        getRulesByStandardId: jest.fn(),
        getRuleExamples: jest.fn(),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerGetStandardDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ standardSlug: 'test-standard' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get standard: Database connection failed',
          },
        ],
      });
    });
  });

  describe('when standard has no rules', () => {
    let resultText: string;
    let mockStandardsAdapter: {
      findStandardBySlug: jest.Mock;
      getRulesByStandardId: jest.Mock;
      getRuleExamples: jest.Mock;
    };

    beforeEach(async () => {
      const mockStandard = {
        id: 'std-no-rules',
        slug: 'no-rules-standard',
        name: 'No Rules Standard',
        version: 1,
        description: 'A standard without any rules',
      };

      mockStandardsAdapter = {
        findStandardBySlug: jest.fn().mockResolvedValue(mockStandard),
        getRulesByStandardId: jest.fn().mockResolvedValue([]),
        getRuleExamples: jest.fn(),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerGetStandardDetailsTool(dependencies, mcpServer);

      const result = await toolHandler({ standardSlug: 'no-rules-standard' });
      resultText = result.content[0].text;
    });

    it('includes standard name', () => {
      expect(resultText).toContain('# No Rules Standard');
    });

    it('includes standard slug', () => {
      expect(resultText).toContain('**Slug:** no-rules-standard');
    });

    it('includes description content', () => {
      expect(resultText).toContain('A standard without any rules');
    });

    it('omits rules section', () => {
      expect(resultText).not.toContain('## Rules');
    });

    it('does not fetch rule examples', () => {
      expect(mockStandardsAdapter.getRuleExamples).not.toHaveBeenCalled();
    });
  });
});
