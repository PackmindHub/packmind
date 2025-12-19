import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import { IEventTrackingPort, Space } from '@packmind/types';
import { registerSaveStandardRuleTool } from './saveStandardRule.tool';
import { ToolDependencies, UserContext } from './types';
import * as utils from './utils';

jest.mock('@packmind/node-utils', () => ({
  extractCodeFromMarkdown: jest.fn((code: string) => code),
}));
jest.mock('./utils');

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

    // Default: return a non-trial user
    mockAccountsAdapter.getUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      trial: false,
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

    it('adds rule with standardSlug and ruleContent', async () => {
      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardId: 'standard-123',
          version: '1.1.0',
        }),
        getRulesByStandardId: jest.fn().mockResolvedValue([
          {
            id: 'rule-123',
            content: 'Use meaningful variable names',
          },
        ]),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerSaveStandardRuleTool(dependencies, mcpServer);

      const result = await toolHandler({
        standardSlug: 'typescript-best-practices',
        ruleContent: 'Use meaningful variable names',
      });

      expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith({
        standardSlug: 'typescript-best-practices',
        ruleContent: 'Use meaningful variable names',
        organizationId: 'org-123',
        userId: 'user-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Rule added successfully to standard 'typescript-best-practices'. New version 1.1.0 created.",
          },
        ],
      });
    });

    it('adds rule with positive and negative examples and language', async () => {
      const { extractCodeFromMarkdown } = jest.requireMock(
        '@packmind/node-utils',
      );
      extractCodeFromMarkdown.mockImplementation((code: string) =>
        code.replace(/```typescript\n|\n```/g, ''),
      );

      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardId: 'standard-123',
          version: '1.1.0',
        }),
        getRulesByStandardId: jest.fn().mockResolvedValue([
          {
            id: 'rule-123',
            content: 'Use const for immutable variables',
          },
        ]),
        createRuleExample: jest.fn().mockResolvedValue({}),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerSaveStandardRuleTool(dependencies, mcpServer);

      const result = await toolHandler({
        standardSlug: 'typescript-best-practices',
        ruleContent: 'Use const for immutable variables',
        positiveExample: '```typescript\nconst PI = 3.14;\n```',
        negativeExample: '```typescript\nlet PI = 3.14;\n```',
        language: 'typescript',
      });

      expect(mockAdapter.createRuleExample).toHaveBeenCalledWith({
        ruleId: 'rule-123',
        positive: 'const PI = 3.14;',
        negative: 'let PI = 3.14;',
        lang: 'TYPESCRIPT',
        organizationId: 'org-123',
        userId: 'user-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Rule added successfully to standard 'typescript-best-practices'. New version 1.1.0 created.",
          },
        ],
      });
    });

    it('converts standardSlug to lowercase', async () => {
      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardId: 'standard-123',
          version: '1.2.0',
        }),
        getRulesByStandardId: jest.fn().mockResolvedValue([
          {
            id: 'rule-123',
            content: 'Follow naming conventions',
          },
        ]),
      };

      mockFastify.standardsHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerSaveStandardRuleTool(dependencies, mcpServer);

      const result = await toolHandler({
        standardSlug: 'TypeScript-Best-Practices',
        ruleContent: 'Follow naming conventions',
      });

      expect(mockAdapter.addRuleToStandard).toHaveBeenCalledWith({
        standardSlug: 'typescript-best-practices',
        ruleContent: 'Follow naming conventions',
        organizationId: 'org-123',
        userId: 'user-123',
      });

      expect(result.content[0].text).toContain('typescript-best-practices');
    });

    it('uses extractCodeFromMarkdown on examples', async () => {
      const { extractCodeFromMarkdown } = jest.requireMock(
        '@packmind/node-utils',
      );
      extractCodeFromMarkdown.mockImplementation((code: string) =>
        code ? 'extracted: ' + code : '',
      );

      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardId: 'standard-123',
          version: '1.1.0',
        }),
        getRulesByStandardId: jest.fn().mockResolvedValue([
          {
            id: 'rule-123',
            content: 'Test rule',
          },
        ]),
        createRuleExample: jest.fn().mockResolvedValue({}),
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

      expect(extractCodeFromMarkdown).toHaveBeenCalledWith(
        '```js\nconst x = 1;\n```',
      );
      expect(extractCodeFromMarkdown).toHaveBeenCalledWith(
        '```js\nvar x = 1;\n```',
      );

      expect(mockAdapter.createRuleExample).toHaveBeenCalledWith(
        expect.objectContaining({
          positive: 'extracted: ```js\nconst x = 1;\n```',
          negative: 'extracted: ```js\nvar x = 1;\n```',
        }),
      );
    });

    it('tracks analytics event on success', async () => {
      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardId: 'standard-123',
          version: '1.1.0',
        }),
        getRulesByStandardId: jest.fn().mockResolvedValue([
          {
            id: 'rule-123',
            content: 'Test rule',
          },
        ]),
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
      it('does not create rule example', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardId: 'standard-123',
            version: '1.1.0',
          }),
          getRulesByStandardId: jest.fn().mockResolvedValue([
            {
              id: 'rule-123',
              content: 'Test rule',
            },
          ]),
          createRuleExample: jest.fn().mockResolvedValue({}),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
        });

        expect(mockAdapter.createRuleExample).not.toHaveBeenCalled();
      });
    });

    describe('when only positive example provided', () => {
      it('creates rule example', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardId: 'standard-123',
            version: '1.1.0',
          }),
          getRulesByStandardId: jest.fn().mockResolvedValue([
            {
              id: 'rule-123',
              content: 'Test rule',
            },
          ]),
          createRuleExample: jest.fn().mockResolvedValue({}),
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

        expect(mockAdapter.createRuleExample).toHaveBeenCalledWith(
          expect.objectContaining({
            ruleId: 'rule-123',
            positive: 'const x = 1;',
            negative: '',
          }),
        );
      });
    });

    describe('when only negative example provided', () => {
      it('creates rule example', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardId: 'standard-123',
            version: '1.1.0',
          }),
          getRulesByStandardId: jest.fn().mockResolvedValue([
            {
              id: 'rule-123',
              content: 'Test rule',
            },
          ]),
          createRuleExample: jest.fn().mockResolvedValue({}),
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

        expect(mockAdapter.createRuleExample).toHaveBeenCalledWith(
          expect.objectContaining({
            ruleId: 'rule-123',
            positive: '',
            negative: 'var x = 1;',
          }),
        );
      });
    });

    describe('when language is not provided with examples', () => {
      it('returns error', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardId: 'standard-123',
            version: '1.1.0',
          }),
          getRulesByStandardId: jest.fn().mockResolvedValue([
            {
              id: 'rule-123',
              content: 'Test rule',
            },
          ]),
          createRuleExample: jest.fn().mockResolvedValue({}),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        const result = await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
          positiveExample: 'const x = 1;',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Failed to add rule to standard: Language input cannot be empty',
            },
          ],
        });

        expect(mockAdapter.createRuleExample).not.toHaveBeenCalled();
      });
    });

    describe('when invalid language is provided', () => {
      it('returns error', async () => {
        const mockAdapter = {
          addRuleToStandard: jest.fn().mockResolvedValue({
            standardId: 'standard-123',
            version: '1.1.0',
          }),
          getRulesByStandardId: jest.fn().mockResolvedValue([
            {
              id: 'rule-123',
              content: 'Test rule',
            },
          ]),
          createRuleExample: jest.fn().mockResolvedValue({}),
        };

        mockFastify.standardsHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveStandardRuleTool(dependencies, mcpServer);

        const result = await toolHandler({
          standardSlug: 'test-standard',
          ruleContent: 'Test rule',
          positiveExample: 'const x = 1;',
          language: 'invalid-language',
        });

        expect(result.content[0].text).toContain(
          'Failed to add rule to standard: Unknown programming language',
        );
        expect(mockAdapter.createRuleExample).not.toHaveBeenCalled();
      });
    });

    it('handles empty string examples by not creating rule example', async () => {
      const mockAdapter = {
        addRuleToStandard: jest.fn().mockResolvedValue({
          standardId: 'standard-123',
          version: '1.1.0',
        }),
        getRulesByStandardId: jest.fn().mockResolvedValue([
          {
            id: 'rule-123',
            content: 'Test rule',
          },
        ]),
        createRuleExample: jest.fn().mockResolvedValue({}),
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

      expect(mockAdapter.createRuleExample).not.toHaveBeenCalled();
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
            const mockAdapter = {
              addRuleToStandard: jest.fn().mockResolvedValue({
                standardId: 'standard-123',
                version: '1.1.0',
              }),
              getRulesByStandardId: jest.fn().mockResolvedValue([
                {
                  id: 'rule-123',
                  content: 'Test rule',
                },
              ]),
            };

            mockFastify.standardsHexa.mockReturnValue({
              getAdapter: () => mockAdapter,
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

            registerSaveStandardRuleTool(dependencies, mcpServer);

            const result = await toolHandler({
              standardSlug: 'test-standard',
              ruleContent: 'Test rule',
            });

            expect(mockDeploymentsAdapter.createPackage).toHaveBeenCalledWith({
              userId: 'user-123',
              organizationId: 'org-123',
              spaceId: 'space-123',
              name: 'Default',
              description:
                'Default package for organizing your standards and recipes',
              recipeIds: [],
              standardIds: ['standard-123'],
            });

            expect(result.content[0].text).toContain(
              "Rule added successfully to standard 'test-standard'",
            );
            expect(result.content[0].text).toContain(
              '**IMPORTANT: You MUST now call packmind_install_package',
            );
          });
        });

        describe('when Default package already exists', () => {
          it('adds standard to existing Default package and returns install prompt', async () => {
            const mockAdapter = {
              addRuleToStandard: jest.fn().mockResolvedValue({
                standardId: 'standard-456',
                version: '1.2.0',
              }),
              getRulesByStandardId: jest.fn().mockResolvedValue([
                {
                  id: 'rule-456',
                  content: 'Another rule',
                },
              ]),
            };

            mockFastify.standardsHexa.mockReturnValue({
              getAdapter: () => mockAdapter,
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

            registerSaveStandardRuleTool(dependencies, mcpServer);

            const result = await toolHandler({
              standardSlug: 'another-standard',
              ruleContent: 'Another rule',
            });

            expect(
              mockDeploymentsAdapter.addArtefactsToPackage,
            ).toHaveBeenCalledWith({
              userId: 'user-123',
              organizationId: 'org-123',
              packageId: 'existing-package-123',
              standardIds: ['standard-456'],
            });

            expect(mockDeploymentsAdapter.createPackage).not.toHaveBeenCalled();

            expect(result.content[0].text).toContain(
              "Rule added successfully to standard 'another-standard'",
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
          const mockAdapter = {
            addRuleToStandard: jest.fn().mockResolvedValue({
              standardId: 'standard-789',
              version: '1.3.0',
            }),
            getRulesByStandardId: jest.fn().mockResolvedValue([
              {
                id: 'rule-789',
                content: 'Regular rule',
              },
            ]),
          };

          mockFastify.standardsHexa.mockReturnValue({
            getAdapter: () => mockAdapter,
          });

          registerSaveStandardRuleTool(dependencies, mcpServer);

          const result = await toolHandler({
            standardSlug: 'regular-standard',
            ruleContent: 'Regular rule',
          });

          expect(mockDeploymentsAdapter.listPackages).not.toHaveBeenCalled();
          expect(mockDeploymentsAdapter.createPackage).not.toHaveBeenCalled();
          expect(
            mockDeploymentsAdapter.addArtefactsToPackage,
          ).not.toHaveBeenCalled();

          expect(result.content[0].text).toBe(
            "Rule added successfully to standard 'regular-standard'. New version 1.3.0 created.",
          );
          expect(result.content[0].text).not.toContain(
            'packmind_install_package',
          );
        });
      });
    });
  });
});
