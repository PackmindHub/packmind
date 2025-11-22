import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerCreateStandardTool } from './createStandard.tool';
import { ToolDependencies, UserContext } from './types';

describe('createStandardWorkflow.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ deploymentsHexa: () => unknown }>;
  let userContext: UserContext;

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

  describe('registerCreateStandardTool', () => {
    let toolHandler: (params: {
      step?: string;
    }) => Promise<{ content: { type: string; text: string }[] }>;

    beforeEach(() => {
      (mcpServer.tool as jest.Mock).mockImplementation(
        (name, description, schema, handler) => {
          if (name === 'create_standard') {
            toolHandler = handler;
          }
        },
      );
    });

    it('registers the tool with correct name and description', () => {
      registerCreateStandardTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'create_standard',
        'Get step-by-step guidance for the Packmind standard creation workflow. Provide an optional step to retrieve a specific stage.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    describe('when no step specified', () => {
      it('returns default step content', async () => {
        registerCreateStandardTool(dependencies, mcpServer);

        const result = await toolHandler({});

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining(
                '# Step 1 · Check for Similar Standards',
              ),
            },
          ],
        });
      });
    });

    it('returns specific step content for initial-request', async () => {
      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({ step: 'initial-request' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              '# Step 1 · Check for Similar Standards',
            ),
          },
        ],
      });
    });

    it('returns specific step content for clarify', async () => {
      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({ step: 'clarify' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              '# Step 2 · Capture and Clarify the Request',
            ),
          },
        ],
      });
    });

    it('returns specific step content for drafting', async () => {
      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({ step: 'drafting' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              '# Step 3 · Draft and Iterate with the User',
            ),
          },
        ],
      });
    });

    it('returns specific step content for finalization', async () => {
      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({ step: 'finalization' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('# Step 5 · Finalization Prep'),
          },
        ],
      });
    });

    it('returns error message for invalid step name', async () => {
      registerCreateStandardTool(dependencies, mcpServer);

      const result = await toolHandler({ step: 'invalid-step' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Unknown workflow step 'invalid-step'. Available steps: initial-request, clarify, drafting, finalization",
          },
        ],
      });
    });

    describe('when userContext is available', () => {
      it('tracks analytics event with correct step', async () => {
        registerCreateStandardTool(dependencies, mcpServer);

        await toolHandler({ step: 'clarify' });

        expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          'mcp_tool_call',
          { tool: 'create_standard', step: 'clarify' },
        );
      });
    });

    describe('when userContext is missing', () => {
      it('does not track analytics', async () => {
        dependencies.userContext = undefined;
        registerCreateStandardTool(dependencies, mcpServer);

        const result = await toolHandler({ step: 'initial-request' });

        expect(mockAnalyticsAdapter.trackEvent).not.toHaveBeenCalled();
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining(
                '# Step 1 · Check for Similar Standards',
              ),
            },
          ],
        });
      });
    });

    describe('when no step provided', () => {
      it("defaults to 'initial-request'", async () => {
        registerCreateStandardTool(dependencies, mcpServer);

        await toolHandler({});

        expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          'mcp_tool_call',
          {
            tool: 'create_standard',
            step: 'initial-request',
          },
        );
      });
    });

    it('tracks analytics with different steps for each valid step', async () => {
      registerCreateStandardTool(dependencies, mcpServer);

      const steps = ['initial-request', 'clarify', 'drafting', 'finalization'];

      for (const step of steps) {
        mockAnalyticsAdapter.trackEvent.mockClear();
        await toolHandler({ step });
        expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          'mcp_tool_call',
          { tool: 'create_standard', step },
        );
      }
    });

    describe('when userContext is missing for default step', () => {
      it('continues to work', async () => {
        dependencies.userContext = undefined;
        registerCreateStandardTool(dependencies, mcpServer);

        const result = await toolHandler({});

        expect(mockAnalyticsAdapter.trackEvent).not.toHaveBeenCalled();
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining(
                '# Step 1 · Check for Similar Standards',
              ),
            },
          ],
        });
      });
    });
  });
});
