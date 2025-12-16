import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  FileUpdates,
  RecipeVersion,
  StandardVersion,
  RecipeVersionId,
  RecipeId,
  StandardVersionId,
  StandardId,
  UserId,
} from '@packmind/types';
import { CodingAgent } from '../../domain/CodingAgents';
import { CodingAgentServices } from './CodingAgentServices';
import { DeployerService } from './DeployerService';

describe('CodingAgentServices', () => {
  let service: CodingAgentServices;
  let mockDeployerService: jest.Mocked<DeployerService>;
  let mockLogger: PackmindLogger;

  const mockRecipeVersions: RecipeVersion[] = [
    {
      id: 'recipe-version-1' as RecipeVersionId,
      recipeId: 'recipe-1' as RecipeId,
      name: 'Test Recipe',
      slug: 'test-recipe',
      content: '# Test Recipe Content',
      version: 1,
      summary: 'Test recipe summary',
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
      summary: 'Test standard summary',
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
    it('validates and delegates to DeployerService', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
        delete: [],
      };

      mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
        mockFileUpdates,
      );

      const existingFiles = new Map<string, string>();
      existingFiles.set('CLAUDE.md', 'existing content');

      const result = await service.renderArtifacts(
        {
          recipeVersions: mockRecipeVersions,
          standardVersions: mockStandardVersions,
        },
        {
          recipeVersions: [],
          standardVersions: [],
        },
        ['claude'],
        existingFiles,
      );

      expect(
        mockDeployerService.aggregateArtifactRendering,
      ).toHaveBeenCalledWith(
        mockRecipeVersions,
        mockStandardVersions,
        ['claude'],
        existingFiles,
      );
      expect(result).toEqual(mockFileUpdates);
    });

    it('handles empty recipe versions array', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'standards only' }],
        delete: [],
      };

      mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
        mockFileUpdates,
      );

      const existingFiles = new Map<string, string>();

      const result = await service.renderArtifacts(
        {
          recipeVersions: [],
          standardVersions: mockStandardVersions,
        },
        {
          recipeVersions: [],
          standardVersions: [],
        },
        ['claude'],
        existingFiles,
      );

      expect(
        mockDeployerService.aggregateArtifactRendering,
      ).toHaveBeenCalledWith(
        [],
        mockStandardVersions,
        ['claude'],
        existingFiles,
      );
      expect(result).toEqual(mockFileUpdates);
    });

    it('handles empty standard versions array', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'recipes only' }],
        delete: [],
      };

      mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
        mockFileUpdates,
      );

      const existingFiles = new Map<string, string>();

      const result = await service.renderArtifacts(
        {
          recipeVersions: mockRecipeVersions,
          standardVersions: [],
        },
        {
          recipeVersions: [],
          standardVersions: [],
        },
        ['claude'],
        existingFiles,
      );

      expect(
        mockDeployerService.aggregateArtifactRendering,
      ).toHaveBeenCalledWith(mockRecipeVersions, [], ['claude'], existingFiles);
      expect(result).toEqual(mockFileUpdates);
    });

    describe('when codingAgents array is empty', () => {
      it('returns empty FileUpdates', async () => {
        const existingFiles = new Map<string, string>();

        const result = await service.renderArtifacts(
          {
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
          },
          {
            recipeVersions: [],
            standardVersions: [],
          },
          [],
          existingFiles,
        );

        expect(
          mockDeployerService.aggregateArtifactRendering,
        ).not.toHaveBeenCalled();
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
          recipeVersions: mockRecipeVersions,
          standardVersions: mockStandardVersions,
        },
        {
          recipeVersions: [],
          standardVersions: [],
        },
        ['claude', 'agents_md'],
        existingFiles,
      );

      expect(
        mockDeployerService.aggregateArtifactRendering,
      ).toHaveBeenCalledWith(
        mockRecipeVersions,
        mockStandardVersions,
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
          recipeVersions: mockRecipeVersions,
          standardVersions: mockStandardVersions,
        },
        {
          recipeVersions: [],
          standardVersions: [],
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
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
          },
          {
            recipeVersions: [],
            standardVersions: [],
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

      const removedRecipe: RecipeVersion = {
        id: 'recipe-version-removed' as RecipeVersionId,
        recipeId: 'recipe-removed' as RecipeId,
        name: 'Removed Recipe',
        slug: 'removed-recipe',
        content: '# Removed Recipe',
        version: 1,
        summary: 'Removed recipe',
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
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
          },
          {
            recipeVersions: [removedRecipe],
            standardVersions: [],
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
            recipeVersions: [removedRecipe],
            standardVersions: [],
          },
          {
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
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
        summary: 'Removed standard',
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
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
          },
          {
            recipeVersions: [],
            standardVersions: [removedStandard],
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
          },
          {
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
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

      const removedRecipe: RecipeVersion = {
        id: 'recipe-version-removed' as RecipeVersionId,
        recipeId: 'recipe-removed' as RecipeId,
        name: 'Removed Recipe',
        slug: 'removed-recipe',
        content: '# Removed Recipe',
        version: 1,
        summary: 'Removed recipe',
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
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
          },
          {
            recipeVersions: [removedRecipe],
            standardVersions: [],
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
            recipeVersions: [removedRecipe],
            standardVersions: [],
          },
          {
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
          },
        );
      });
    });

    describe('when removed arrays are empty', () => {
      it('does not process removed artifacts', async () => {
        const mockFileUpdates: FileUpdates = {
          createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
          delete: [],
        };

        mockDeployerService.aggregateArtifactRendering.mockResolvedValue(
          mockFileUpdates,
        );

        const result = await service.renderArtifacts(
          {
            recipeVersions: mockRecipeVersions,
            standardVersions: mockStandardVersions,
          },
          {
            recipeVersions: [],
            standardVersions: [],
          },
          ['claude'],
          new Map(),
        );

        expect(mockDeployerService.getDeployerForAgent).not.toHaveBeenCalled();
        expect(result.delete).toHaveLength(0);
      });
    });
  });
});
