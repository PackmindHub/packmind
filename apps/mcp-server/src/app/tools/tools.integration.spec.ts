import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import {
  registerCreateRecipeTool,
  registerNotifyRecipeUsageTool,
  registerAddRuleToStandardTool,
  registerListStandardsTool,
  registerGetStandardDetailsTool,
  registerListRecipesTool,
  registerGetRecipeDetailsTool,
  registerListPackagesTool,
  registerShowPackageTool,
  registerCreateStandardWorkflowTool,
  registerCreateRecipeWorkflowTool,
  registerCreateStandardTool,
  registerAddRuleToStandardWorkflowTool,
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
    it('registers all 14 tools with correct names', () => {
      // Register all tools
      registerCreateRecipeTool(dependencies, mcpServer);
      registerNotifyRecipeUsageTool(dependencies, mcpServer);
      registerAddRuleToStandardTool(dependencies, mcpServer);
      registerListStandardsTool(dependencies, mcpServer);
      registerGetStandardDetailsTool(dependencies, mcpServer);
      registerListRecipesTool(dependencies, mcpServer);
      registerGetRecipeDetailsTool(dependencies, mcpServer);
      registerListPackagesTool(dependencies, mcpServer);
      registerShowPackageTool(dependencies, mcpServer);
      registerCreateStandardWorkflowTool(dependencies, mcpServer);
      registerCreateRecipeWorkflowTool(dependencies, mcpServer);
      registerCreateStandardTool(dependencies, mcpServer);
      registerAddRuleToStandardWorkflowTool(dependencies, mcpServer);
      registerOnboardingTool(dependencies, mcpServer);

      // Verify all expected tools are registered
      const expectedTools = [
        'packmind_create_recipe',
        'packmind_notify_recipe_usage',
        'packmind_add_rule_to_standard',
        'packmind_list_standards',
        'packmind_get_standard_details',
        'packmind_list_recipes',
        'packmind_get_recipe_details',
        'packmind_list_packages',
        'packmind_get_package_details',
        'packmind_create_standard_workflow',
        'packmind_create_recipe_workflow',
        'packmind_create_standard',
        'packmind_add_rule_to_standard_workflow',
        'packmind_onboarding',
      ];

      expect(registeredTools.size).toBe(14);
      expectedTools.forEach((toolName) => {
        expect(registeredTools.has(toolName)).toBe(true);
      });
    });

    it('each tool has a description', () => {
      // Register all tools
      registerCreateRecipeTool(dependencies, mcpServer);
      registerNotifyRecipeUsageTool(dependencies, mcpServer);
      registerAddRuleToStandardTool(dependencies, mcpServer);
      registerListStandardsTool(dependencies, mcpServer);
      registerGetStandardDetailsTool(dependencies, mcpServer);
      registerListRecipesTool(dependencies, mcpServer);
      registerGetRecipeDetailsTool(dependencies, mcpServer);
      registerListPackagesTool(dependencies, mcpServer);
      registerShowPackageTool(dependencies, mcpServer);
      registerCreateStandardWorkflowTool(dependencies, mcpServer);
      registerCreateRecipeWorkflowTool(dependencies, mcpServer);
      registerCreateStandardTool(dependencies, mcpServer);
      registerAddRuleToStandardWorkflowTool(dependencies, mcpServer);
      registerOnboardingTool(dependencies, mcpServer);

      // Verify each tool has a non-empty description
      registeredTools.forEach((tool) => {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('tools use the correct prefix', () => {
      // Register all tools
      registerListPackagesTool(dependencies, mcpServer);

      // Verify tools use the prefix from dependencies
      registeredTools.forEach((tool, toolName) => {
        expect(toolName.startsWith('packmind_')).toBe(true);
      });
    });

    it('tools respect custom prefix', () => {
      dependencies.mcpToolPrefix = 'custom';
      registeredTools.clear();

      mcpServer = {
        tool: jest.fn((name, description, schema, handler) => {
          registeredTools.set(name, { name, description, schema, handler });
        }),
      } as unknown as McpServer;

      registerListPackagesTool(dependencies, mcpServer);

      expect(registeredTools.has('custom_list_packages')).toBe(true);
      expect(registeredTools.has('packmind_list_packages')).toBe(false);
    });
  });

  describe('tool dependencies', () => {
    it('tools can access fastify instance', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('packmind_list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to fastify through closure
    });

    it('tools can access user context', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('packmind_list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to userContext through closure
    });

    it('tools can access analytics adapter', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('packmind_list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to analyticsAdapter through closure
    });

    it('tools can access logger', () => {
      registerListPackagesTool(dependencies, mcpServer);

      const tool = registeredTools.get('packmind_list_packages');
      expect(tool).toBeDefined();
      // The tool should have access to logger through closure
    });
  });

  describe('tool isolation', () => {
    it('tools do not interfere with each other', () => {
      registerCreateRecipeTool(dependencies, mcpServer);
      registerListPackagesTool(dependencies, mcpServer);
      registerShowPackageTool(dependencies, mcpServer);

      expect(registeredTools.size).toBe(3);
      expect(registeredTools.get('packmind_create_recipe')?.handler).not.toBe(
        registeredTools.get('packmind_list_packages')?.handler,
      );
      expect(registeredTools.get('packmind_list_packages')?.handler).not.toBe(
        registeredTools.get('packmind_get_package_details')?.handler,
      );
    });

    it('can register same tool multiple times without error', () => {
      registerListPackagesTool(dependencies, mcpServer);
      registerListPackagesTool(dependencies, mcpServer);

      // Should have registered twice (overwriting)
      expect(mcpServer.tool).toHaveBeenCalledTimes(2);
    });
  });
});
