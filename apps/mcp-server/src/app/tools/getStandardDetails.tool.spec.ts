import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerGetStandardDetailsTool } from './getStandardDetails.tool';
import { ToolDependencies, UserContext } from './types';

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
        if (name === 'packmind_get_standard_details') {
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
      'packmind_get_standard_details',
      'Get the full content of a standard including its rules and examples by its slug.',
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('returns formatted standard details with rules and examples', async () => {
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

    expect(result.content[0].text).toContain('# Test Standard');
    expect(result.content[0].text).toContain('**Slug:** test-standard');
    expect(result.content[0].text).toContain('**Version:** 1');
    expect(result.content[0].text).toContain('## Description');
    expect(result.content[0].text).toContain('A test standard description');
    expect(result.content[0].text).toContain('## Rules');
    expect(result.content[0].text).toContain('### Rule: Always use TypeScript');
    expect(result.content[0].text).toContain(
      '**Positive Example (TypeScript):**',
    );
    expect(result.content[0].text).toContain('```typescript');
    expect(result.content[0].text).toContain('const foo: string = "bar";');
    expect(result.content[0].text).toContain(
      '**Negative Example (TypeScript):**',
    );
    expect(result.content[0].text).toContain('const foo = "bar";');
  });

  it('returns formatted standard details with multiple rules and examples', async () => {
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

    const mockStandardsAdapter = {
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

    expect(result.content[0].text).toContain(
      '### Rule: Use const for constants',
    );
    expect(result.content[0].text).toContain(
      '### Rule: Prefer arrow functions',
    );
    expect(result.content[0].text).toContain('const PI = 3.14;');
    expect(result.content[0].text).toContain('const add = (a, b) => a + b;');
    expect(mockStandardsAdapter.getRuleExamples).toHaveBeenCalledTimes(2);
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
      { tool: 'packmind_get_standard_details', standardSlug: 'analytics-test' },
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

  it('handles standard with no rules', async () => {
    const mockStandard = {
      id: 'std-no-rules',
      slug: 'no-rules-standard',
      name: 'No Rules Standard',
      version: 1,
      description: 'A standard without any rules',
    };

    const mockStandardsAdapter = {
      findStandardBySlug: jest.fn().mockResolvedValue(mockStandard),
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
      getRuleExamples: jest.fn(),
    };

    mockFastify.standardsHexa.mockReturnValue({
      getAdapter: () => mockStandardsAdapter,
    });

    registerGetStandardDetailsTool(dependencies, mcpServer);

    const result = await toolHandler({ standardSlug: 'no-rules-standard' });

    expect(result.content[0].text).toContain('# No Rules Standard');
    expect(result.content[0].text).toContain('**Slug:** no-rules-standard');
    expect(result.content[0].text).toContain('A standard without any rules');
    expect(result.content[0].text).not.toContain('## Rules');
    expect(mockStandardsAdapter.getRuleExamples).not.toHaveBeenCalled();
  });
});
