import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort } from '@packmind/types';
import { registerInstallPackageTool } from './installPackage.tool';
import { ToolDependencies, UserContext } from '../types';

describe('installPackage.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockLogger: ReturnType<typeof stubLogger>;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{ deploymentsHexa: () => unknown }>;
  let userContext: UserContext;
  let toolHandler: (params: {
    packageSlug?: string;
    relativePath?: string;
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

    (mcpServer.tool as jest.Mock).mockImplementation(
      (name, description, schema, handler) => {
        if (name === 'install_package') {
          toolHandler = handler;
        }
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the tool with correct name and description', () => {
    registerInstallPackageTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'install_package',
      expect.stringContaining('Install a Packmind package'),
      expect.any(Object),
      expect.any(Function),
    );
  });

  describe('when returning installation instructions', () => {
    let resultText: string;

    beforeEach(async () => {
      registerInstallPackageTool(dependencies, mcpServer);
      const result = await toolHandler({});
      resultText = result.content[0].text;
    });

    it('includes installation header', () => {
      expect(resultText).toContain('# Package Installation Instructions');
    });

    it('includes packmind_list_packages reference', () => {
      expect(resultText).toContain('packmind_list_packages');
    });

    it('includes packmind-cli install command', () => {
      expect(resultText).toContain('packmind-cli install');
    });

    it('includes packmind.json reference', () => {
      expect(resultText).toContain('packmind.json');
    });

    it('includes packageSlug reference', () => {
      expect(resultText).toContain('packageSlug');
    });

    it('includes installedPackages reference', () => {
      expect(resultText).toContain('installedPackages');
    });

    it('includes packmind_render_package reference', () => {
      expect(resultText).toContain('packmind_render_package');
    });

    it('includes gitRemoteUrl reference', () => {
      expect(resultText).toContain('gitRemoteUrl');
    });

    it('includes gitBranch reference', () => {
      expect(resultText).toContain('gitBranch');
    });
  });

  it('tracks analytics', async () => {
    registerInstallPackageTool(dependencies, mcpServer);

    await toolHandler({ packageSlug: 'my-package', relativePath: '/' });

    expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
      'user-123',
      'org-123',
      'mcp_tool_call',
      expect.objectContaining({
        tool: 'install_package',
        packageSlug: 'my-package',
        relativePath: '/',
      }),
    );
  });

  it('does not call deploymentsHexa', async () => {
    registerInstallPackageTool(dependencies, mcpServer);

    await toolHandler({});

    expect(mockFastify.deploymentsHexa).not.toHaveBeenCalled();
  });

  describe('when user context is missing', () => {
    it('throws error', async () => {
      dependencies.userContext = undefined;

      registerInstallPackageTool(dependencies, mcpServer);

      await expect(toolHandler({})).rejects.toThrow(
        'User context is required to install a package',
      );
    });
  });
});
