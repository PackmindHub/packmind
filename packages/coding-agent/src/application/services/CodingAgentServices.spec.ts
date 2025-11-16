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
        mockRecipeVersions,
        mockStandardVersions,
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
        [],
        mockStandardVersions,
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
        mockRecipeVersions,
        [],
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
          mockRecipeVersions,
          mockStandardVersions,
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
        mockRecipeVersions,
        mockStandardVersions,
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
        mockRecipeVersions,
        mockStandardVersions,
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
          mockRecipeVersions,
          mockStandardVersions,
          ['claude'],
          existingFiles,
        ),
      ).rejects.toThrow('Rendering failed');
    });
  });
});
