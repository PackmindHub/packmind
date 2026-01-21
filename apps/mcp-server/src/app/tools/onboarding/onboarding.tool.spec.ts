import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerOnboardingTool } from './onboarding.tool';
import { ToolDependencies, UserContext } from '../types';

describe('onboarding.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ deploymentsHexa: () => unknown }>;
  let userContext: UserContext;
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

  describe('registerOnboardingTool', () => {
    let toolHandler: (params: {
      workflow?: string;
    }) => Promise<{ content: { type: string; text: string }[] }>;

    beforeEach(() => {
      (mcpServer.tool as jest.Mock).mockImplementation(
        (name, description, schema, handler) => {
          if (name === 'onboarding') {
            toolHandler = handler;
          }
        },
      );
    });

    it('registers the tool with correct name and description', () => {
      registerOnboardingTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'onboarding',
        'Get onboarding workflows for coding standards creation. Returns mode selection if no workflow specified, or specific workflow content.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    describe('when no workflow specified', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({});
      });

      it('returns mode selection title', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining(
                '# Contextualized Coding Standards Creation - Mode Selection',
              ),
            },
          ],
        });
      });

      it('includes method selection content', async () => {
        expect(result.content[0].text).toContain('Method Selection');
      });
    });

    describe('when codebase-analysis workflow specified', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({ workflow: 'codebase-analysis' });
      });

      it('returns content with text type', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.any(String),
            },
          ],
        });
      });

      it('returns non-empty content', async () => {
        expect(result.content[0].text.length).toBeGreaterThan(0);
      });
    });

    describe('when git-history workflow specified', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({ workflow: 'git-history' });
      });

      it('returns content with text type', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.any(String),
            },
          ],
        });
      });

      it('returns non-empty content', async () => {
        expect(result.content[0].text.length).toBeGreaterThan(0);
      });
    });

    describe('when documentation workflow specified', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({ workflow: 'documentation' });
      });

      it('returns content with text type', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.any(String),
            },
          ],
        });
      });

      it('returns non-empty content', async () => {
        expect(result.content[0].text.length).toBeGreaterThan(0);
      });
    });

    describe('when ai-instructions workflow specified', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({ workflow: 'ai-instructions' });
      });

      it('returns content with text type', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.any(String),
            },
          ],
        });
      });

      it('returns non-empty content', async () => {
        expect(result.content[0].text.length).toBeGreaterThan(0);
      });
    });

    describe('when web-research workflow specified', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({ workflow: 'web-research' });
      });

      it('returns content with text type', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.any(String),
            },
          ],
        });
      });

      it('returns non-empty content', async () => {
        expect(result.content[0].text.length).toBeGreaterThan(0);
      });
    });

    describe('when invalid workflow name', () => {
      it('returns error message', async () => {
        registerOnboardingTool(dependencies, mcpServer);

        const result = await toolHandler({ workflow: 'invalid-workflow' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: "No workflow found for 'invalid-workflow'. Available workflows: codebase-analysis, git-history, documentation, ai-instructions, web-research",
            },
          ],
        });
      });
    });

    describe('when workflow is specified', () => {
      it('tracks analytics event with correct workflow step', async () => {
        registerOnboardingTool(dependencies, mcpServer);

        await toolHandler({ workflow: 'codebase-analysis' });

        expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          'mcp_tool_call',
          { tool: 'onboarding', step: 'codebase-analysis' },
        );
      });
    });

    describe('when no workflow specified', () => {
      it('tracks analytics event with mode-selection step', async () => {
        registerOnboardingTool(dependencies, mcpServer);

        await toolHandler({});

        expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          'mcp_tool_call',
          { tool: 'onboarding', step: 'mode-selection' },
        );
      });
    });

    describe('when userContext is missing', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        dependencies.userContext = undefined;
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({ workflow: 'codebase-analysis' });
      });

      it('does not track analytics', async () => {
        expect(mockAnalyticsAdapter.trackEvent).not.toHaveBeenCalled();
      });

      it('still returns workflow content', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.any(String),
            },
          ],
        });
      });
    });

    it('handles errors gracefully and returns error message', async () => {
      // Mock the logger to throw an error to simulate an unexpected error in the handler
      mockLogger.info.mockImplementation(() => {
        throw new Error('Unexpected logger error');
      });

      registerOnboardingTool(dependencies, mcpServer);

      const result = await toolHandler({ workflow: 'codebase-analysis' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to retrieve onboarding content: Unexpected logger error',
          },
        ],
      });
    });

    it('handles non-Error exceptions gracefully', async () => {
      mockLogger.info.mockImplementation(() => {
        throw 'String error';
      });

      registerOnboardingTool(dependencies, mcpServer);

      const result = await toolHandler({ workflow: 'codebase-analysis' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to retrieve onboarding content: String error',
          },
        ],
      });
    });

    describe('when userContext is missing for mode-selection', () => {
      let result: { content: { type: string; text: string }[] };

      beforeEach(async () => {
        dependencies.userContext = undefined;
        registerOnboardingTool(dependencies, mcpServer);
        result = await toolHandler({});
      });

      it('does not track analytics', async () => {
        expect(mockAnalyticsAdapter.trackEvent).not.toHaveBeenCalled();
      });

      it('still returns mode selection content', async () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining(
                '# Contextualized Coding Standards Creation - Mode Selection',
              ),
            },
          ],
        });
      });
    });

    it('tracks analytics with different workflow steps for each valid workflow', async () => {
      registerOnboardingTool(dependencies, mcpServer);

      const workflows = [
        'codebase-analysis',
        'git-history',
        'documentation',
        'ai-instructions',
        'web-research',
      ];

      for (const workflow of workflows) {
        mockAnalyticsAdapter.trackEvent.mockClear();
        await toolHandler({ workflow });
        expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          'mcp_tool_call',
          { tool: 'onboarding', step: workflow },
        );
      }
    });
  });
});
