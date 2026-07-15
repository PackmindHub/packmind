import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  DeleteItemType,
  FileUpdates,
  CommandVersion,
  SkillId,
  SkillVersion,
  SkillVersionId,
  StandardVersion,
  CommandVersionId,
  CommandId,
  StandardVersionId,
  StandardId,
  UserId,
  CodingAgent,
} from '@packmind/types';
import { CodingAgentServices } from './CodingAgentServices';
import { DeployerService } from './DeployerService';

describe('CodingAgentServices', () => {
  let service: CodingAgentServices;
  let mockDeployerService: jest.Mocked<DeployerService>;
  let mockLogger: PackmindLogger;

  const mockCommandVersions: CommandVersion[] = [
    {
      id: 'recipe-version-1' as CommandVersionId,
      recipeId: 'recipe-1' as CommandId,
      name: 'Test Recipe',
      slug: 'test-recipe',
      content: '# Test Recipe Content',
      version: 1,
      userId: 'user-1' as UserId,
    },
  ];

  const mockStandardVersions: StandardVersion[] = [
    {
      id: 'standard-version-1' as StandardVersionId,
      standardId: 'standard-1' as StandardId,
      name: 'Test Standard',
      slug: 'test-standard',
      description: 'Test standard description',
      version: 1,
      userId: 'user-1' as UserId,
      scope: 'test',
    },
  ];

  beforeEach(() => {
    mockLogger = stubLogger();
    mockDeployerService = {
      aggregateRecipeDeployments: jest.fn(),
      aggregateStandardsDeployments: jest.fn(),
      aggregateArtifactRendering: jest.fn(),
      getDeployerForAgent: jest.fn(),
    } as unknown as jest.Mocked<DeployerService>;

    service = new CodingAgentServices(mockDeployerService, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renderArtifacts', () => {
    describe('when validating and delegating to DeployerService', () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
        delete: [],
      };

      let result: FileUpdates;
      let existingFiles: Map<string, string>;

      beforeEach(async () => {
        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        existingFiles = new Map<string, string>();
        existingFiles.set('CLAUDE.md', 'existing content');

        result = await service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          ['claude'],
          existingFiles,
        );
      });

      it('calls aggregateArtifactRendering with correct parameters', () => {
        expect(
          mockDeployerService.aggregateArtifactRendering,
        ).toHaveBeenCalledWith(
          mockCommandVersions,
          mockStandardVersions,
          [],
          ['claude'],
          existingFiles,
        );
      });

      it('returns the file updates', () => {
        expect(result).toEqual(mockFileUpdates);
      });
    });

    describe('when recipe versions array is empty', () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'standards only' }],
        delete: [],
      };

      let result: FileUpdates;
      let existingFiles: Map<string, string>;

      beforeEach(async () => {
        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        existingFiles = new Map<string, string>();

        result = await service.renderArtifacts(
          {
            recipeVersions: [],
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          ['claude'],
          existingFiles,
        );
      });

      it('calls aggregateArtifactRendering with empty recipe versions', () => {
        expect(
          mockDeployerService.aggregateArtifactRendering,
        ).toHaveBeenCalledWith(
          [],
          mockStandardVersions,
          [],
          ['claude'],
          existingFiles,
        );
      });

      it('returns the file updates', () => {
        expect(result).toEqual(mockFileUpdates);
      });
    });

    describe('when standard versions array is empty', () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'recipes only' }],
        delete: [],
      };

      let result: FileUpdates;
      let existingFiles: Map<string, string>;

      beforeEach(async () => {
        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        existingFiles = new Map<string, string>();

        result = await service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          ['claude'],
          existingFiles,
        );
      });

      it('calls aggregateArtifactRendering with empty standard versions', () => {
        expect(
          mockDeployerService.aggregateArtifactRendering,
        ).toHaveBeenCalledWith(
          mockCommandVersions,
          [],
          [],
          ['claude'],
          existingFiles,
        );
      });

      it('returns the file updates', () => {
        expect(result).toEqual(mockFileUpdates);
      });
    });

    describe('when codingAgents array is empty', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const existingFiles = new Map<string, string>();

        result = await service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          [],
          existingFiles,
        );
      });

      it('does not call aggregateArtifactRendering', () => {
        expect(
          mockDeployerService.aggregateArtifactRendering,
        ).not.toHaveBeenCalled();
      });

      it('returns empty FileUpdates', () => {
        expect(result).toEqual({
          createOrUpdate: [],
          delete: [],
        });
      });
    });

    it('passes existing files map correctly', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [],
        delete: [],
      };

      mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
        mockFileUpdates,
      );

      const existingFiles = new Map<string, string>();
      existingFiles.set('CLAUDE.md', 'claude content');
      existingFiles.set('AGENTS.md', 'agents content');

      await service.renderArtifacts(
        {
          recipeVersions: mockCommandVersions,
          standardVersions: mockStandardVersions,
          skillVersions: [],
        },
        {
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
        },
        ['claude', 'agents_md'],
        existingFiles,
      );

      expect(
        mockDeployerService.aggregateArtifactRendering,
      ).toHaveBeenCalledWith(
        mockCommandVersions,
        mockStandardVersions,
        [],
        ['claude', 'agents_md'],
        existingFiles,
      );
    });

    it('handles multiple coding agents', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [
          { path: 'CLAUDE.md', content: 'claude content' },
          { path: '.cursorrules', content: 'cursor content' },
        ],
        delete: [],
      };

      mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
        mockFileUpdates,
      );

      const existingFiles = new Map<string, string>();
      const agents: CodingAgent[] = ['claude', 'cursor'];

      const result = await service.renderArtifacts(
        {
          recipeVersions: mockCommandVersions,
          standardVersions: mockStandardVersions,
          skillVersions: [],
        },
        {
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
        },
        agents,
        existingFiles,
      );

      expect(result.createOrUpdate).toHaveLength(2);
    });

    it('propagates errors from deployerService', async () => {
      mockDeployerService.aggregateArtifactRendering.mockRejectedValue(
        new Error('Rendering failed'),
      );

      const existingFiles = new Map<string, string>();

      await expect(
        service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          ['claude'],
          existingFiles,
        ),
      ).rejects.toThrow('Rendering failed');
    });

    describe('when recipes are removed', () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
        delete: [],
      };

      const removedCommand: CommandVersion = {
        id: 'recipe-version-removed' as CommandVersionId,
        recipeId: 'recipe-removed' as CommandId,
        name: 'Removed Recipe',
        slug: 'removed-recipe',
        content: '# Removed Recipe',
        version: 1,
        userId: 'user-1' as UserId,
      };

      const mockDeployer = {
        generateRemovalFileUpdates: jest.fn().mockResolvedValue({
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              sections: [{ key: 'Packmind recipes', content: '' }],
            },
          ],
          delete: [],
        }),
      };

      let result: FileUpdates;

      beforeEach(async () => {
        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        mockDeployerService.getDeployerForAgent.mockReturnValue(
          mockDeployer as unknown as ReturnType<
            DeployerService['getDeployerForAgent']
          >,
        );

        result = await service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [removedCommand],
            standardVersions: [],
            skillVersions: [],
          },
          ['claude'],
          new Map(),
        );
      });

      it('retrieves the deployer for the agent', () => {
        expect(mockDeployerService.getDeployerForAgent).toHaveBeenCalledWith(
          'claude',
        );
      });

      it('calls generateRemovalFileUpdates with removed recipes', () => {
        expect(mockDeployer.generateRemovalFileUpdates).toHaveBeenCalledWith(
          {
            recipeVersions: [removedCommand],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
        );
      });

      it('includes removal updates in the result', () => {
        expect(result.createOrUpdate).toContainEqual({
          path: 'CLAUDE.md',
          sections: [{ key: 'Packmind recipes', content: '' }],
        });
      });
    });

    describe('when standards are removed', () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
        delete: [],
      };

      const removedStandard: StandardVersion = {
        id: 'standard-version-removed' as StandardVersionId,
        standardId: 'standard-removed' as StandardId,
        name: 'Removed Standard',
        slug: 'removed-standard',
        description: 'Removed standard',
        version: 1,
        userId: 'user-1' as UserId,
        scope: 'test',
      };

      const mockDeployer = {
        generateRemovalFileUpdates: jest.fn().mockResolvedValue({
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              sections: [{ key: 'Packmind standards', content: '' }],
            },
          ],
          delete: [],
        }),
      };

      let result: FileUpdates;

      beforeEach(async () => {
        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        mockDeployerService.getDeployerForAgent.mockReturnValue(
          mockDeployer as unknown as ReturnType<
            DeployerService['getDeployerForAgent']
          >,
        );

        result = await service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [removedStandard],
            skillVersions: [],
          },
          ['claude'],
          new Map(),
        );
      });

      it('retrieves the deployer for the agent', () => {
        expect(mockDeployerService.getDeployerForAgent).toHaveBeenCalledWith(
          'claude',
        );
      });

      it('calls generateRemovalFileUpdates with removed standards', () => {
        expect(mockDeployer.generateRemovalFileUpdates).toHaveBeenCalledWith(
          {
            recipeVersions: [],
            standardVersions: [removedStandard],
            skillVersions: [],
          },
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
        );
      });

      it('includes removal updates in the result', () => {
        expect(result.createOrUpdate).toContainEqual({
          path: 'CLAUDE.md',
          sections: [{ key: 'Packmind standards', content: '' }],
        });
      });
    });

    describe('when multiple agents are specified', () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
        delete: [],
      };

      const removedCommand: CommandVersion = {
        id: 'recipe-version-removed' as CommandVersionId,
        recipeId: 'recipe-removed' as CommandId,
        name: 'Removed Recipe',
        slug: 'removed-recipe',
        content: '# Removed Recipe',
        version: 1,
        userId: 'user-1' as UserId,
      };

      const mockDeployer = {
        generateRemovalFileUpdates: jest.fn().mockResolvedValue({
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              sections: [{ key: 'Packmind recipes', content: '' }],
            },
          ],
          delete: [],
        }),
      };

      beforeEach(async () => {
        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        mockDeployerService.getDeployerForAgent.mockReturnValue(
          mockDeployer as unknown as ReturnType<
            DeployerService['getDeployerForAgent']
          >,
        );

        await service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [removedCommand],
            standardVersions: [],
            skillVersions: [],
          },
          ['claude', 'cursor'],
          new Map(),
        );
      });

      it('retrieves a deployer for each agent', () => {
        expect(mockDeployerService.getDeployerForAgent).toHaveBeenCalledTimes(
          2,
        );
      });

      it('retrieves the deployer for claude agent', () => {
        expect(mockDeployerService.getDeployerForAgent).toHaveBeenCalledWith(
          'claude',
        );
      });

      it('retrieves the deployer for cursor agent', () => {
        expect(mockDeployerService.getDeployerForAgent).toHaveBeenCalledWith(
          'cursor',
        );
      });

      it('calls generateRemovalFileUpdates with removed artifacts', () => {
        expect(mockDeployer.generateRemovalFileUpdates).toHaveBeenCalledWith(
          {
            recipeVersions: [removedCommand],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
        );
      });
    });

    describe('when removed arrays are empty', () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
        delete: [],
      };

      let result: FileUpdates;

      beforeEach(async () => {
        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        result = await service.renderArtifacts(
          {
            recipeVersions: mockCommandVersions,
            standardVersions: mockStandardVersions,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          ['claude'],
          new Map(),
        );
      });

      it('does not call getDeployerForAgent', () => {
        expect(mockDeployerService.getDeployerForAgent).not.toHaveBeenCalled();
      });

      it('returns result with empty delete array', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('burn and rebuild for skills', () => {
      const createMockFileUpdates = (): FileUpdates => ({
        createOrUpdate: [
          {
            path: '.claude/skills/my-skill/SKILL.md',
            content: 'skill content',
          },
        ],
        delete: [],
      });

      const mockSkillVersion: SkillVersion = {
        id: 'skill-version-1' as SkillVersionId,
        skillId: 'skill-1' as SkillId,
        name: 'My Skill',
        slug: 'my-skill',
        description: 'A test skill',
        prompt: 'Test prompt',
        version: 1,
        userId: 'user-1' as UserId,
      };

      describe('when installed skills exist', () => {
        const mockDeployer = {
          generateRemovalFileUpdates: jest.fn().mockResolvedValue({
            createOrUpdate: [],
            delete: [],
          }),
          getSkillsFolderPath: jest.fn().mockReturnValue('.claude/skills/'),
        };

        let result: FileUpdates;

        beforeEach(async () => {
          mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
            createMockFileUpdates(),
          );

          mockDeployerService.getDeployerForAgent.mockReturnValue(
            mockDeployer as unknown as ReturnType<
              DeployerService['getDeployerForAgent']
            >,
          );

          result = await service.renderArtifacts(
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [mockSkillVersion],
            },
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [],
            },
            ['claude'],
            new Map(),
          );
        });

        it('adds skill directory to delete list for burn and rebuild', () => {
          expect(result.delete).toContainEqual({
            path: '.claude/skills/my-skill',
            type: DeleteItemType.Directory,
          });
        });

        it('calls getSkillsFolderPath on the deployer', () => {
          expect(mockDeployer.getSkillsFolderPath).toHaveBeenCalled();
        });
      });

      describe('when skills are removed', () => {
        const mockDeployer = {
          generateRemovalFileUpdates: jest.fn().mockResolvedValue({
            createOrUpdate: [],
            delete: [],
          }),
          getSkillsFolderPath: jest.fn().mockReturnValue('.claude/skills/'),
        };

        const removedSkill: SkillVersion = {
          id: 'skill-version-removed' as SkillVersionId,
          skillId: 'skill-removed' as SkillId,
          name: 'Removed Skill',
          slug: 'removed-skill',
          description: 'A removed skill',
          prompt: 'Removed prompt',
          version: 1,
          userId: 'user-1' as UserId,
        };

        let result: FileUpdates;

        beforeEach(async () => {
          mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
            createMockFileUpdates(),
          );

          mockDeployerService.getDeployerForAgent.mockReturnValue(
            mockDeployer as unknown as ReturnType<
              DeployerService['getDeployerForAgent']
            >,
          );

          result = await service.renderArtifacts(
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [mockSkillVersion],
            },
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [removedSkill],
            },
            ['claude'],
            new Map(),
          );
        });

        it('adds installed skill directory to delete list', () => {
          expect(result.delete).toContainEqual({
            path: '.claude/skills/my-skill',
            type: DeleteItemType.Directory,
          });
        });

        it('adds removed skill directory to delete list', () => {
          expect(result.delete).toContainEqual({
            path: '.claude/skills/removed-skill',
            type: DeleteItemType.Directory,
          });
        });
      });

      describe('when multiple agents are configured', () => {
        const claudeDeployer = {
          generateRemovalFileUpdates: jest.fn().mockResolvedValue({
            createOrUpdate: [],
            delete: [],
          }),
          getSkillsFolderPath: jest.fn().mockReturnValue('.claude/skills/'),
        };

        const copilotDeployer = {
          generateRemovalFileUpdates: jest.fn().mockResolvedValue({
            createOrUpdate: [],
            delete: [],
          }),
          getSkillsFolderPath: jest.fn().mockReturnValue('.github/skills/'),
        };

        let result: FileUpdates;

        beforeEach(async () => {
          mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
            createMockFileUpdates(),
          );

          mockDeployerService.getDeployerForAgent.mockImplementation(
            (agent: CodingAgent) => {
              if (agent === 'claude') {
                return claudeDeployer as unknown as ReturnType<
                  DeployerService['getDeployerForAgent']
                >;
              }
              return copilotDeployer as unknown as ReturnType<
                DeployerService['getDeployerForAgent']
              >;
            },
          );

          result = await service.renderArtifacts(
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [mockSkillVersion],
            },
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [],
            },
            ['claude', 'copilot'],
            new Map(),
          );
        });

        it('adds skill directories for Claude agent', () => {
          expect(result.delete).toContainEqual({
            path: '.claude/skills/my-skill',
            type: DeleteItemType.Directory,
          });
        });

        it('adds skill directories for Copilot agent', () => {
          expect(result.delete).toContainEqual({
            path: '.github/skills/my-skill',
            type: DeleteItemType.Directory,
          });
        });
      });

      describe('when deployer does not support skills', () => {
        const mockDeployer = {
          generateRemovalFileUpdates: jest.fn().mockResolvedValue({
            createOrUpdate: [],
            delete: [],
          }),
          getSkillsFolderPath: jest.fn().mockReturnValue(undefined),
        };

        let result: FileUpdates;

        beforeEach(async () => {
          mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
            createMockFileUpdates(),
          );

          mockDeployerService.getDeployerForAgent.mockReturnValue(
            mockDeployer as unknown as ReturnType<
              DeployerService['getDeployerForAgent']
            >,
          );

          result = await service.renderArtifacts(
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [mockSkillVersion],
            },
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [],
            },
            ['cursor'],
            new Map(),
          );
        });

        it('does not add skill directories to delete list', () => {
          expect(
            result.delete.filter((d) => d.path.includes('skills')),
          ).toHaveLength(0);
        });
      });

      describe('when no skills exist', () => {
        let result: FileUpdates;

        beforeEach(async () => {
          mockDeployerService.aggregateArtifactRendering.mockResolvedValue({
            createOrUpdate: [],
            delete: [],
          });

          result = await service.renderArtifacts(
            {
              recipeVersions: mockCommandVersions,
              standardVersions: mockStandardVersions,
              skillVersions: [],
            },
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [],
            },
            ['claude'],
            new Map(),
          );
        });

        it('does not add any skill directories to delete list', () => {
          expect(
            result.delete.filter((d) => d.path.includes('skills')),
          ).toHaveLength(0);
        });
      });
    });
  });
});
