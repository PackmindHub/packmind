import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import {
  IEventTrackingPort,
  ProgrammingLanguage,
  Space,
} from '@packmind/types';
import * as nodeUtils from '@packmind/node-utils';
import * as types from '@packmind/types';
import { registerSaveStandardTool } from './saveStandard.tool';
import { ToolDependencies, UserContext } from '../types';
import * as utils from '../utils';

jest.mock('@packmind/node-utils');
jest.mock('../utils');
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
    accountsHexa: () => unknown;
  }>;
  let userContext: UserContext;
  let mockStandardsAdapter: jest.Mocked<{
    createStandardWithExamples: jest.Mock;
    createStandardWithPackages: jest.Mock;
  }>;
  let mockAccountsAdapter: jest.Mocked<{
    getUserById: jest.Mock;
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
      createStandardWithPackages: jest.fn(),
    };

    mockAccountsAdapter = {
      getUserById: jest.fn(),
    };

    // Default: return a non-trial user
    mockAccountsAdapter.getUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      trial: false,
    });

    mockFastify = {
      standardsHexa: jest.fn(),
      spacesHexa: jest.fn(),
      accountsHexa: jest.fn().mockReturnValue({
        getAdapter: () => mockAccountsAdapter,
      }),
    } as unknown as jest.Mocked<{
      standardsHexa: () => unknown;
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
      tool: jest.fn(),
    } as unknown as McpServer;

    (mcpServer.tool as jest.Mock).mockImplementation(
      (name, description, schema, handler) => {
        if (name === 'save_standard') {
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
    registerSaveStandardTool(dependencies, mcpServer);

    expect(mcpServer.tool).toHaveBeenCalledWith(
      'save_standard',
      'Create a new coding standard with multiple rules and optional examples in a single operation. Do not call this tool directly—you need to first use the tool packmind_create_standard.',
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

      mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerSaveStandardTool(dependencies, mcpServer);

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
        mockStandardsAdapter.createStandardWithPackages,
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
        packageSlugs: undefined,
        source: 'mcp',
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

      mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerSaveStandardTool(dependencies, mcpServer);

      const result = await toolHandler({
        name: 'Empty Standard',
        description: 'A standard without rules',
      });

      expect(
        mockStandardsAdapter.createStandardWithPackages,
      ).toHaveBeenCalledWith({
        name: 'Empty Standard',
        description: 'A standard without rules',
        summary: undefined,
        rules: [],
        organizationId: 'org-123',
        userId: 'user-123',
        scope: null,
        spaceId: 'space-123',
        packageSlugs: undefined,
        source: 'mcp',
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

      mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerSaveStandardTool(dependencies, mcpServer);

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
        mockStandardsAdapter.createStandardWithPackages,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: undefined,
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

        registerSaveStandardTool(dependencies, mcpServer);

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
          mockStandardsAdapter.createStandardWithPackages,
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

      mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      (nodeUtils.extractCodeFromMarkdown as jest.Mock)
        .mockReturnValueOnce('extracted positive code')
        .mockReturnValueOnce('extracted negative code');

      registerSaveStandardTool(dependencies, mcpServer);

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
        mockStandardsAdapter.createStandardWithPackages,
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

      mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
        mockStandard,
      );

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockStandardsAdapter,
      });

      registerSaveStandardTool(dependencies, mcpServer);

      await toolHandler({
        name: 'Analytics Test Standard',
        description: 'Testing analytics',
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-123',
        'mcp_tool_call',
        { tool: 'save_standard' },
      );
    });
  });

  describe('error handling', () => {
    describe('when user context is missing', () => {
      it('throws error', async () => {
        dependencies.userContext = undefined;

        registerSaveStandardTool(dependencies, mcpServer);

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
        mockStandardsAdapter.createStandardWithPackages.mockRejectedValue(
          new Error('Database connection failed'),
        );

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockStandardsAdapter,
        });

        registerSaveStandardTool(dependencies, mcpServer);

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
        mockStandardsAdapter.createStandardWithPackages.mockRejectedValue(
          'String error',
        );

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockStandardsAdapter,
        });

        registerSaveStandardTool(dependencies, mcpServer);

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

      mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
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

      registerSaveStandardTool(dependencies, mcpServer);

      await toolHandler({
        name: 'Space Test Standard',
        description: 'Testing space usage',
      });

      expect(utils.getGlobalSpace).toHaveBeenCalledWith(mockFastify, 'org-123');

      expect(
        mockStandardsAdapter.createStandardWithPackages,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'custom-space-456',
        }),
      );
    });
  });

  describe('trial user behavior', () => {
    let mockDeploymentsAdapter: jest.Mocked<{
      listPackages: jest.Mock;
      createPackage: jest.Mock;
      addArtefactsToPackage: jest.Mock;
    }>;

    beforeEach(() => {
      mockDeploymentsAdapter = {
        listPackages: jest.fn(),
        createPackage: jest.fn(),
        addArtefactsToPackage: jest.fn(),
      };

      (mockFastify as unknown as Record<string, jest.Mock>).deploymentsHexa =
        jest.fn().mockReturnValue({
          getAdapter: () => mockDeploymentsAdapter,
        });
    });

    describe('when user is a trial user', () => {
      beforeEach(() => {
        mockAccountsAdapter.getUserById.mockResolvedValue({
          id: 'user-123',
          email: 'trial-abc@packmind.trial',
          trial: true,
        });
      });

      describe('when Default package does not exist', () => {
        it('creates Default package with the standard and returns install prompt', async () => {
          const mockStandard = {
            id: 'standard-123',
            slug: 'test-standard',
            name: 'Test Standard',
          };

          mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
            mockStandard,
          );

          mockFastify.standardsHexa.mockReturnValue({
            getAdapter: () => mockStandardsAdapter,
          });

          mockDeploymentsAdapter.listPackages.mockResolvedValue({
            packages: [],
          });

          mockDeploymentsAdapter.createPackage.mockResolvedValue({
            package: {
              id: 'package-123',
              slug: 'default',
              name: 'Default',
            },
          });

          registerSaveStandardTool(dependencies, mcpServer);

          const result = await toolHandler({
            name: 'Test Standard',
            description: 'A test standard',
          });

          expect(mockDeploymentsAdapter.createPackage).toHaveBeenCalledWith({
            userId: 'user-123',
            organizationId: 'org-123',
            spaceId: 'space-123',
            name: 'Default',
            description:
              'Default package for organizing your standards and commands',
            recipeIds: [],
            standardIds: ['standard-123'],
            source: 'mcp',
          });

          expect(result.content[0].text).toContain(
            "Standard 'test-standard' has been created successfully",
          );
          expect(result.content[0].text).toContain(
            '**IMPORTANT: You MUST now call packmind_install_package',
          );
          expect(result.content[0].text).toContain('This is a required step');
        });
      });

      describe('when Default package already exists', () => {
        it('adds standard to existing Default package and returns install prompt', async () => {
          const mockStandard = {
            id: 'standard-456',
            slug: 'another-standard',
            name: 'Another Standard',
          };

          mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
            mockStandard,
          );

          mockFastify.standardsHexa.mockReturnValue({
            getAdapter: () => mockStandardsAdapter,
          });

          mockDeploymentsAdapter.listPackages.mockResolvedValue({
            packages: [
              {
                id: 'existing-package-123',
                slug: 'default',
                name: 'Default',
                spaceId: 'space-123',
              },
            ],
          });

          registerSaveStandardTool(dependencies, mcpServer);

          const result = await toolHandler({
            name: 'Another Standard',
            description: 'Another test standard',
          });

          expect(
            mockDeploymentsAdapter.addArtefactsToPackage,
          ).toHaveBeenCalledWith({
            userId: 'user-123',
            organizationId: 'org-123',
            packageId: 'existing-package-123',
            standardIds: ['standard-456'],
            source: 'mcp',
          });

          expect(mockDeploymentsAdapter.createPackage).not.toHaveBeenCalled();

          expect(result.content[0].text).toContain(
            "Standard 'another-standard' has been created successfully",
          );
          expect(result.content[0].text).toContain(
            '**IMPORTANT: You MUST now call packmind_install_package with packageSlugs: ["default"]',
          );
        });
      });
    });

    describe('when user is not a trial user', () => {
      beforeEach(() => {
        mockAccountsAdapter.getUserById.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          trial: false,
        });
      });

      it('does not create or add to Default package', async () => {
        const mockStandard = {
          id: 'standard-789',
          slug: 'regular-standard',
          name: 'Regular Standard',
        };

        mockStandardsAdapter.createStandardWithPackages.mockResolvedValue(
          mockStandard,
        );

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockStandardsAdapter,
        });

        registerSaveStandardTool(dependencies, mcpServer);

        const result = await toolHandler({
          name: 'Regular Standard',
          description: 'A regular standard',
        });

        expect(mockDeploymentsAdapter.listPackages).not.toHaveBeenCalled();
        expect(mockDeploymentsAdapter.createPackage).not.toHaveBeenCalled();
        expect(
          mockDeploymentsAdapter.addArtefactsToPackage,
        ).not.toHaveBeenCalled();

        expect(result.content[0].text).toBe(
          "Standard 'regular-standard' has been created successfully with 0 rules and 0 examples.",
        );
        expect(result.content[0].text).not.toContain(
          'packmind_install_package',
        );
      });
    });
  });
});
