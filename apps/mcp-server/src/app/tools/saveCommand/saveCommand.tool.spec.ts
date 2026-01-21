import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IEventTrackingPort,
  RecipeId,
  Space,
} from '@packmind/types';
import { registerSaveCommandTool } from './saveCommand.tool';
import { ToolDependencies, UserContext } from '../types';

// Mock getGlobalSpace utility
jest.mock('../utils', () => ({
  getGlobalSpace: jest.fn(),
}));

import { getGlobalSpace } from '../utils';

describe('saveCommand.tool', () => {
  let mcpServer: McpServer;
  let dependencies: ToolDependencies;
  let mockAnalyticsAdapter: jest.Mocked<IEventTrackingPort>;
  let mockFastify: jest.Mocked<{
    recipesHexa: () => unknown;
    spacesHexa: () => unknown;
    accountsHexa: () => unknown;
  }>;
  let userContext: UserContext;
  let mockGetGlobalSpace: jest.MockedFunction<typeof getGlobalSpace>;
  let mockAccountsAdapter: jest.Mocked<{
    getUserById: jest.Mock;
  }>;

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
      recipesHexa: jest.fn(),
      spacesHexa: jest.fn(),
      accountsHexa: jest.fn().mockReturnValue({
        getAdapter: () => mockAccountsAdapter,
      }),
    } as unknown as jest.Mocked<{
      recipesHexa: () => unknown;
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

    mockGetGlobalSpace = getGlobalSpace as jest.MockedFunction<
      typeof getGlobalSpace
    >;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerSaveCommandTool', () => {
    let toolHandler: (params: {
      name: string;
      summary: string;
      whenToUse: string[];
      contextValidationCheckpoints: string[];
      steps: Array<{
        name: string;
        description: string;
        codeSnippet?: string;
      }>;
    }) => Promise<{ content: { type: string; text: string }[] }>;

    beforeEach(() => {
      (mcpServer.tool as jest.Mock).mockImplementation(
        (name, description, schema, handler) => {
          if (name === 'save_command') {
            toolHandler = handler;
          }
        },
      );
    });

    it('registers the tool with correct name and description', () => {
      registerSaveCommandTool(dependencies, mcpServer);

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'save_command',
        'Create a new reusable command as a structured Packmind command. Do not call this tool directly—you need to first use the tool packmind_create_command.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    describe('when creating command with all parameters', () => {
      let result: { content: { type: string; text: string }[] };
      let mockAdapter: { captureRecipe: jest.Mock };

      beforeEach(async () => {
        const mockCommand = {
          id: 'command-123' as RecipeId,
          name: 'Test Command',
          summary: 'A test command summary',
          whenToUse: ['When testing'],
          contextValidationCheckpoints: ['Ensure tests exist'],
          steps: [
            {
              name: 'Step 1',
              description: 'First step',
              codeSnippet: undefined,
            },
          ],
        };

        const mockGlobalSpace: Space = {
          id: createSpaceId('space-123'),
          name: 'Global Space',
          slug: 'global-space',
          organizationId: createOrganizationId('org-123'),
        };

        mockAdapter = {
          captureRecipe: jest.fn().mockResolvedValue(mockCommand),
        };

        mockGetGlobalSpace.mockResolvedValue(mockGlobalSpace);
        mockFastify.recipesHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveCommandTool(dependencies, mcpServer);

        result = await toolHandler({
          name: 'Test Command',
          summary: 'A test command summary',
          whenToUse: ['When testing'],
          contextValidationCheckpoints: ['Ensure tests exist'],
          steps: [
            {
              name: 'Step 1',
              description: 'First step',
            },
          ],
        });
      });

      it('calls captureRecipe with correct parameters', () => {
        expect(mockAdapter.captureRecipe).toHaveBeenCalledWith({
          name: 'Test Command',
          summary: 'A test command summary',
          whenToUse: ['When testing'],
          contextValidationCheckpoints: ['Ensure tests exist'],
          steps: [
            {
              name: 'Step 1',
              description: 'First step',
            },
          ],
          organizationId: createOrganizationId('org-123'),
          userId: createUserId('user-123'),
          spaceId: createSpaceId('space-123'),
          source: 'mcp',
        });
      });

      it('returns success message', () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: "Command 'Test Command' has been created successfully.",
            },
          ],
        });
      });
    });

    describe('when creating command with complex steps including code snippets', () => {
      let result: { content: { type: string; text: string }[] };
      let mockAdapter: { captureRecipe: jest.Mock };

      beforeEach(async () => {
        const mockCommand = {
          id: 'command-456' as RecipeId,
          name: 'Complex Command',
          summary: 'A complex command with code snippets',
          whenToUse: [
            'When creating TypeORM entities',
            'When setting up database migrations',
          ],
          contextValidationCheckpoints: [
            'Database connection is configured',
            'TypeORM is installed',
          ],
          steps: [
            {
              name: 'Create Entity',
              description:
                'Define a TypeORM entity with proper decorators and types',
              codeSnippet: `\`\`\`typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
\`\`\``,
            },
            {
              name: 'Generate Migration',
              description: 'Run migration generation command',
              codeSnippet: '```bash\nnpm run migration:generate\n```',
            },
          ],
        };

        const mockGlobalSpace: Space = {
          id: createSpaceId('space-456'),
          name: 'Global Space',
          slug: 'global-space',
          organizationId: createOrganizationId('org-123'),
        };

        mockAdapter = {
          captureRecipe: jest.fn().mockResolvedValue(mockCommand),
        };

        mockGetGlobalSpace.mockResolvedValue(mockGlobalSpace);
        mockFastify.recipesHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveCommandTool(dependencies, mcpServer);

        result = await toolHandler({
          name: 'Complex Command',
          summary: 'A complex command with code snippets',
          whenToUse: [
            'When creating TypeORM entities',
            'When setting up database migrations',
          ],
          contextValidationCheckpoints: [
            'Database connection is configured',
            'TypeORM is installed',
          ],
          steps: [
            {
              name: 'Create Entity',
              description:
                'Define a TypeORM entity with proper decorators and types',
              codeSnippet: `\`\`\`typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
\`\`\``,
            },
            {
              name: 'Generate Migration',
              description: 'Run migration generation command',
              codeSnippet: '```bash\nnpm run migration:generate\n```',
            },
          ],
        });
      });

      it('calls captureRecipe with all step data including code snippets', () => {
        expect(mockAdapter.captureRecipe).toHaveBeenCalledWith({
          name: 'Complex Command',
          summary: 'A complex command with code snippets',
          whenToUse: [
            'When creating TypeORM entities',
            'When setting up database migrations',
          ],
          contextValidationCheckpoints: [
            'Database connection is configured',
            'TypeORM is installed',
          ],
          steps: [
            {
              name: 'Create Entity',
              description:
                'Define a TypeORM entity with proper decorators and types',
              codeSnippet: `\`\`\`typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
\`\`\``,
            },
            {
              name: 'Generate Migration',
              description: 'Run migration generation command',
              codeSnippet: '```bash\nnpm run migration:generate\n```',
            },
          ],
          organizationId: createOrganizationId('org-123'),
          userId: createUserId('user-123'),
          spaceId: createSpaceId('space-456'),
          source: 'mcp',
        });
      });

      it('returns success message', () => {
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: "Command 'Complex Command' has been created successfully.",
            },
          ],
        });
      });
    });

    it('tracks analytics event on success', async () => {
      const mockCommand = {
        id: 'command-789' as RecipeId,
        name: 'Analytics Command',
        summary: 'Testing analytics tracking',
      };

      const mockGlobalSpace: Space = {
        id: createSpaceId('space-789'),
        name: 'Global Space',
        slug: 'global-space',
        organizationId: createOrganizationId('org-123'),
      };

      const mockAdapter = {
        captureRecipe: jest.fn().mockResolvedValue(mockCommand),
      };

      mockGetGlobalSpace.mockResolvedValue(mockGlobalSpace);
      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerSaveCommandTool(dependencies, mcpServer);

      await toolHandler({
        name: 'Analytics Command',
        summary: 'Testing analytics tracking',
        whenToUse: ['When testing analytics'],
        contextValidationCheckpoints: ['Analytics is configured'],
        steps: [
          {
            name: 'Track Event',
            description: 'Call analytics tracking',
          },
        ],
      });

      expect(mockAnalyticsAdapter.trackEvent).toHaveBeenCalledWith(
        createUserId('user-123'),
        createOrganizationId('org-123'),
        'mcp_tool_call',
        { tool: 'save_command' },
      );
    });

    describe('when user context is missing', () => {
      it('throws error', async () => {
        dependencies.userContext = undefined;

        registerSaveCommandTool(dependencies, mcpServer);

        await expect(
          toolHandler({
            name: 'Test Command',
            summary: 'A test command',
            whenToUse: ['When testing'],
            contextValidationCheckpoints: ['Ensure context exists'],
            steps: [
              {
                name: 'Step 1',
                description: 'First step',
              },
            ],
          }),
        ).rejects.toThrow('User context is required to create commands');
      });
    });

    describe('when adapter throws error', () => {
      it('returns error message', async () => {
        const mockGlobalSpace: Space = {
          id: createSpaceId('space-error'),
          name: 'Global Space',
          slug: 'global-space',
          organizationId: createOrganizationId('org-123'),
        };

        const mockAdapter = {
          captureRecipe: jest
            .fn()
            .mockRejectedValue(new Error('Database connection failed')),
        };

        mockGetGlobalSpace.mockResolvedValue(mockGlobalSpace);
        mockFastify.recipesHexa.mockReturnValue({
          getAdapter: () => mockAdapter,
        });

        registerSaveCommandTool(dependencies, mcpServer);

        await expect(
          toolHandler({
            name: 'Error Command',
            summary: 'This should fail',
            whenToUse: ['When testing errors'],
            contextValidationCheckpoints: ['Error handling is configured'],
            steps: [
              {
                name: 'Fail Step',
                description: 'This will fail',
              },
            ],
          }),
        ).rejects.toThrow('Database connection failed');
      });
    });

    it('uses global space via getGlobalSpace', async () => {
      const mockCommand = {
        id: 'command-space' as RecipeId,
        name: 'Space Command',
        summary: 'Testing space usage',
      };

      const mockGlobalSpace: Space = {
        id: createSpaceId('space-global'),
        name: 'Global Space',
        slug: 'global-space',
        organizationId: createOrganizationId('org-123'),
      };

      const mockAdapter = {
        captureRecipe: jest.fn().mockResolvedValue(mockCommand),
      };

      mockGetGlobalSpace.mockResolvedValue(mockGlobalSpace);
      mockFastify.recipesHexa.mockReturnValue({
        getAdapter: () => mockAdapter,
      });

      registerSaveCommandTool(dependencies, mcpServer);

      await toolHandler({
        name: 'Space Command',
        summary: 'Testing space usage',
        whenToUse: ['When testing spaces'],
        contextValidationCheckpoints: ['Space exists'],
        steps: [
          {
            name: 'Use Space',
            description: 'Access the global space',
          },
        ],
      });

      expect(mockGetGlobalSpace).toHaveBeenCalledWith(
        mockFastify,
        createOrganizationId('org-123'),
      );
    });

    describe('when getGlobalSpace fails', () => {
      it('propagates error', async () => {
        mockGetGlobalSpace.mockRejectedValue(
          new Error('No spaces found in organization'),
        );

        registerSaveCommandTool(dependencies, mcpServer);

        await expect(
          toolHandler({
            name: 'No Space Command',
            summary: 'This should fail due to missing space',
            whenToUse: ['When no space exists'],
            contextValidationCheckpoints: ['Space should exist'],
            steps: [
              {
                name: 'Fail',
                description: 'This will fail',
              },
            ],
          }),
        ).rejects.toThrow('No spaces found in organization');
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
          let result: { content: { type: string; text: string }[] };

          beforeEach(async () => {
            const mockCommand = {
              id: 'command-123',
              name: 'Test Command',
            };

            const mockAdapter = {
              captureRecipe: jest.fn().mockResolvedValue(mockCommand),
            };

            mockGetGlobalSpace.mockResolvedValue({
              id: createSpaceId('space-123'),
              name: 'Global Space',
            } as Space);

            mockFastify.recipesHexa.mockReturnValue({
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

            registerSaveCommandTool(dependencies, mcpServer);

            result = await toolHandler({
              name: 'Test Command',
              summary: 'A test command',
              whenToUse: ['When testing'],
              contextValidationCheckpoints: ['Test exists'],
              steps: [{ name: 'Step 1', description: 'Do something' }],
            });
          });

          it('creates Default package with correct parameters', () => {
            expect(mockDeploymentsAdapter.createPackage).toHaveBeenCalledWith({
              userId: 'user-123',
              organizationId: 'org-123',
              spaceId: 'space-123',
              name: 'Default',
              description:
                'Default package for organizing your standards and commands',
              recipeIds: ['command-123'],
              standardIds: [],
              source: 'mcp',
            });
          });

          it('returns success message with command name', () => {
            expect(result.content[0].text).toContain(
              "Command 'Test Command' has been created successfully",
            );
          });

          it('returns install package prompt', () => {
            expect(result.content[0].text).toContain(
              '**IMPORTANT: You MUST now call packmind_install_package',
            );
          });

          it('indicates this is a required step', () => {
            expect(result.content[0].text).toContain('This is a required step');
          });
        });

        describe('when Default package already exists', () => {
          let result: { content: { type: string; text: string }[] };

          beforeEach(async () => {
            const mockCommand = {
              id: 'command-456',
              name: 'Another Command',
            };

            const mockAdapter = {
              captureRecipe: jest.fn().mockResolvedValue(mockCommand),
            };

            mockGetGlobalSpace.mockResolvedValue({
              id: createSpaceId('space-123'),
              name: 'Global Space',
            } as Space);

            mockFastify.recipesHexa.mockReturnValue({
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

            registerSaveCommandTool(dependencies, mcpServer);

            result = await toolHandler({
              name: 'Another Command',
              summary: 'Another test command',
              whenToUse: ['When testing'],
              contextValidationCheckpoints: ['Test exists'],
              steps: [{ name: 'Step 1', description: 'Do something' }],
            });
          });

          it('adds artefacts to existing package', () => {
            expect(
              mockDeploymentsAdapter.addArtefactsToPackage,
            ).toHaveBeenCalledWith({
              userId: 'user-123',
              organizationId: 'org-123',
              packageId: 'existing-package-123',
              recipeIds: ['command-456'],
              standardIds: undefined,
              source: 'mcp',
            });
          });

          it('does not create a new package', () => {
            expect(mockDeploymentsAdapter.createPackage).not.toHaveBeenCalled();
          });

          it('returns success message with command name', () => {
            expect(result.content[0].text).toContain(
              "Command 'Another Command' has been created successfully",
            );
          });

          it('returns install package prompt with default slug', () => {
            expect(result.content[0].text).toContain(
              '**IMPORTANT: You MUST now call packmind_install_package with packageSlugs: ["default"]',
            );
          });
        });
      });

      describe('when user is not a trial user', () => {
        let result: { content: { type: string; text: string }[] };

        beforeEach(async () => {
          mockAccountsAdapter.getUserById.mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com',
            trial: false,
          });

          const mockCommand = {
            id: 'command-789',
            name: 'Regular Command',
          };

          const mockAdapter = {
            captureRecipe: jest.fn().mockResolvedValue(mockCommand),
          };

          mockGetGlobalSpace.mockResolvedValue({
            id: createSpaceId('space-123'),
            name: 'Global Space',
          } as Space);

          mockFastify.recipesHexa.mockReturnValue({
            getAdapter: () => mockAdapter,
          });

          registerSaveCommandTool(dependencies, mcpServer);

          result = await toolHandler({
            name: 'Regular Command',
            summary: 'A regular command',
            whenToUse: ['When testing'],
            contextValidationCheckpoints: ['Test exists'],
            steps: [{ name: 'Step 1', description: 'Do something' }],
          });
        });

        it('does not list packages', () => {
          expect(mockDeploymentsAdapter.listPackages).not.toHaveBeenCalled();
        });

        it('does not create package', () => {
          expect(mockDeploymentsAdapter.createPackage).not.toHaveBeenCalled();
        });

        it('does not add artefacts to package', () => {
          expect(
            mockDeploymentsAdapter.addArtefactsToPackage,
          ).not.toHaveBeenCalled();
        });

        it('returns simple success message', () => {
          expect(result.content[0].text).toBe(
            "Command 'Regular Command' has been created successfully.",
          );
        });

        it('does not include install package prompt', () => {
          expect(result.content[0].text).not.toContain(
            'packmind_install_package',
          );
        });
      });
    });
  });
});
