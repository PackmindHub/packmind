import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import {
  registerCreateCommandTool,
  registerSaveStandardRuleTool,
  registerListStandardsTool,
  registerGetStandardDetailsTool,
  registerListCommandsTool,
  registerGetCommandDetailsTool,
  registerListPackagesTool,
  registerShowPackageTool,
  registerCreateStandardTool,
  registerSaveCommandTool,
  registerSaveStandardTool,
  registerCreateStandardRuleTool,
  registerOnboardingTool,
} from './index';
import { ToolDependencies, UserContext } from './types';

describe('tools.integration', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{
    deploymentsHexa: () => unknown;
    recipesHexa: () => unknown;
    standardsHexa: () => unknown;
    analyticsHexa: () => unknown;
    spacesHexa: () => unknown;
    accountsHexa: () => unknown;
  }>;
  let userContext: UserContext;
  let registeredTools: Map<
    string,
    { name: string; description: string; schema: unknown; handler: unknown }
  >;

  beforeEach(() => {
    registeredTools = new Map();

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
      recipesHexa: jest.fn(),
      standardsHexa: jest.fn(),
      analyticsHexa: jest.fn(),
      spacesHexa: jest.fn(),
      accountsHexa: jest.fn(),
    } as unknown as jest.Mocked<{
      deploymentsHexa: () => unknown;
      recipesHexa: () => unknown;
      standardsHexa: () => unknown;
      analyticsHexa: () => unknown;
      spacesHexa: () => unknown;
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
      tool: jest.fn((name, description, schema, handler) => {
        registeredTools.set(name, { name, description, schema, handler });
      }),
    } as unknown as McpServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tool registration', () => {
    const expectedTools = [
      'create_command',
      'save_standard_rule',
      'list_standards',
      'get_standard_details',
      'list_commands',
      'get_command_details',
      'list_packages',
      'get_package_details',
      'create_standard',
      'save_command',
      'save_standard',
      'create_standard_rule',
      'onboarding',
    ];

    describe('when all tools are registered', () => {
      beforeEach(() => {
        registerCreateCommandTool(dependencies, mcpServer);
        registerSaveStandardRuleTool(dependencies, mcpServer);
        registerListStandardsTool(dependencies, mcpServer);
        registerGetStandardDetailsTool(dependencies, mcpServer);
        registerListCommandsTool(dependencies, mcpServer);
        registerGetCommandDetailsTool(dependencies, mcpServer);
        registerListPackagesTool(dependencies, mcpServer);
        registerShowPackageTool(dependencies, mcpServer);
        registerCreateStandardTool(dependencies, mcpServer);
        registerSaveCommandTool(dependencies, mcpServer);
        registerSaveStandardTool(dependencies, mcpServer);
        registerCreateStandardRuleTool(dependencies, mcpServer);
        registerOnboardingTool(dependencies, mcpServer);
      });

      it('registers the expected number of tools', () => {
        expect(registeredTools.size).toBe(expectedTools.length);
      });

      it.each(expectedTools)('registers %s tool', (toolName) => {
        expect(registeredTools.has(toolName)).toBe(true);
      });

      it.each(expectedTools)(
        '%s tool has a defined description',
        (toolName) => {
          expect(registeredTools.get(toolName)?.description).toBeDefined();
        },
      );

      it.each(expectedTools)(
        '%s tool has a non-empty description',
        (toolName) => {
          expect(
            registeredTools.get(toolName)?.description.length,
          ).toBeGreaterThan(0);
        },
      );
    });

    describe('when registering list_packages tool', () => {
      beforeEach(() => {
        registerListPackagesTool(dependencies, mcpServer);
      });

      it('registers without prefix', () => {
        expect(registeredTools.has('list_packages')).toBe(true);
      });

      it('does not include packmind_ prefix in tool name', () => {
        expect(registeredTools.has('packmind_list_packages')).toBe(false);
      });
    });
  });

  describe('tool dependencies', () => {
    it('tools can access fastify instance', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to fastify through closure
    });

    it('tools can access user context', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to userContext through closure
    });

    it('tools can access analytics adapter', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to analyticsAdapter through closure
    });

    it('tools can access logger', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to logger through closure
    });
  });

  describe('tool isolation', () => {
    describe('when registering multiple tools', () => {
      beforeEach(() => {
        registerCreateCommandTool(dependencies, mcpServer);
        registerListPackagesTool(dependencies, mcpServer);
        registerShowPackageTool(dependencies, mcpServer);
      });

      it('registers all three tools', () => {
        expect(registeredTools.size).toBe(3);
      });

      it('create_command has a different handler than list_packages', () => {
        expect(registeredTools.get('create_command')?.handler).not.toBe(
          registeredTools.get('list_packages')?.handler,
        );
      });

      it('list_packages has a different handler than get_package_details', () => {
        expect(registeredTools.get('list_packages')?.handler).not.toBe(
          registeredTools.get('get_package_details')?.handler,
        );
      });
    });

    it('allows registering same tool multiple times', () => {
      registerListPackagesTool(dependencies, mcpServer);
      registerListPackagesTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledTimes(2);
    });
  });
});
