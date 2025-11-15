import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  FileUpdates,
  RenderArtifactsCommand,
  RecipeVersion,
  StandardVersion,
  RecipeVersionId,
  RecipeId,
  StandardVersionId,
  StandardId,
  UserId,
  OrganizationId,
} from '@packmind/types';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { RenderArtifactsUseCase } from './RenderArtifactsUseCase';

describe('RenderArtifactsUseCase', () => {
  let useCase: RenderArtifactsUseCase;
  let mockCodingAgentServices: jest.Mocked<CodingAgentServices>;
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
    mockCodingAgentServices = {
      renderArtifacts: jest.fn(),
    } as unknown as jest.Mocked<CodingAgentServices>;

    useCase = new RenderArtifactsUseCase(mockCodingAgentServices, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('executes successfully with valid command', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test content' }],
        delete: [],
      };

      mockCodingAgentServices.renderArtifacts.mockResolvedValue(
        mockFileUpdates,
      );

      const existingFiles = new Map<string, string>();
      existingFiles.set('CLAUDE.md', 'existing content');

      const command: RenderArtifactsCommand = {
        recipeVersions: mockRecipeVersions,
        standardVersions: mockStandardVersions,
        codingAgents: ['claude'],
        existingFiles,
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      const result = await useCase.execute(command);

      expect(result).toEqual(mockFileUpdates);
      expect(mockCodingAgentServices.renderArtifacts).toHaveBeenCalledWith(
        mockRecipeVersions,
        mockStandardVersions,
        ['claude'],
        existingFiles,
      );
    });

    it('returns file updates in response', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [
          { path: 'CLAUDE.md', content: 'content 1' },
          { path: 'AGENTS.md', content: 'content 2' },
        ],
        delete: [{ path: 'old.md' }],
      };

      mockCodingAgentServices.renderArtifacts.mockResolvedValue(
        mockFileUpdates,
      );

      const command: RenderArtifactsCommand = {
        recipeVersions: mockRecipeVersions,
        standardVersions: mockStandardVersions,
        codingAgents: ['claude', 'agents_md'],
        existingFiles: new Map(),
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      const result = await useCase.execute(command);

      expect(result.createOrUpdate).toHaveLength(2);
      expect(result.delete).toHaveLength(1);
    });

    it('passes all parameters to CodingAgentServices', async () => {
      mockCodingAgentServices.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });

      const existingFiles = new Map<string, string>();
      existingFiles.set('CLAUDE.md', 'content1');
      existingFiles.set('.cursorrules', 'content2');

      const command: RenderArtifactsCommand = {
        recipeVersions: mockRecipeVersions,
        standardVersions: mockStandardVersions,
        codingAgents: ['claude', 'cursor'],
        existingFiles,
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      await useCase.execute(command);

      expect(mockCodingAgentServices.renderArtifacts).toHaveBeenCalledWith(
        mockRecipeVersions,
        mockStandardVersions,
        ['claude', 'cursor'],
        existingFiles,
      );
    });

    it('handles empty recipe and standard arrays', async () => {
      mockCodingAgentServices.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });

      const command: RenderArtifactsCommand = {
        recipeVersions: [],
        standardVersions: [],
        codingAgents: ['claude'],
        existingFiles: new Map(),
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      await useCase.execute(command);

      expect(mockCodingAgentServices.renderArtifacts).toHaveBeenCalledWith(
        [],
        [],
        ['claude'],
        expect.any(Map),
      );
    });

    it('logs execution details', async () => {
      mockCodingAgentServices.renderArtifacts.mockResolvedValue({
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'content' }],
        delete: [],
      });

      const existingFiles = new Map<string, string>();
      existingFiles.set('CLAUDE.md', 'existing');

      const command: RenderArtifactsCommand = {
        recipeVersions: mockRecipeVersions,
        standardVersions: mockStandardVersions,
        codingAgents: ['claude'],
        existingFiles,
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Executing render artifacts use case',
        {
          recipesCount: 1,
          standardsCount: 1,
          agentsCount: 1,
          existingFilesCount: 1,
          organizationId: 'org-1',
          userId: 'user-1',
        },
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully rendered artifacts',
        {
          totalFiles: 1,
          createOrUpdateFiles: 1,
          deleteFiles: 0,
        },
      );
    });

    it('propagates errors from services layer', async () => {
      mockCodingAgentServices.renderArtifacts.mockRejectedValue(
        new Error('Service error'),
      );

      const command: RenderArtifactsCommand = {
        recipeVersions: mockRecipeVersions,
        standardVersions: mockStandardVersions,
        codingAgents: ['claude'],
        existingFiles: new Map(),
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      await expect(useCase.execute(command)).rejects.toThrow('Service error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to render artifacts',
        {
          error: 'Service error',
          recipesCount: 1,
          standardsCount: 1,
          agentsCount: 1,
        },
      );
    });

    it('handles empty existing files map', async () => {
      mockCodingAgentServices.renderArtifacts.mockResolvedValue({
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'new content' }],
        delete: [],
      });

      const command: RenderArtifactsCommand = {
        recipeVersions: mockRecipeVersions,
        standardVersions: mockStandardVersions,
        codingAgents: ['claude'],
        existingFiles: new Map(),
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      const result = await useCase.execute(command);

      expect(result.createOrUpdate).toHaveLength(1);
    });

    it('handles multiple coding agents', async () => {
      const mockFileUpdates: FileUpdates = {
        createOrUpdate: [
          { path: 'CLAUDE.md', content: 'claude' },
          { path: 'AGENTS.md', content: 'agents' },
          { path: '.cursorrules', content: 'cursor' },
        ],
        delete: [],
      };

      mockCodingAgentServices.renderArtifacts.mockResolvedValue(
        mockFileUpdates,
      );

      const command: RenderArtifactsCommand = {
        recipeVersions: mockRecipeVersions,
        standardVersions: mockStandardVersions,
        codingAgents: ['claude', 'agents_md', 'cursor'],
        existingFiles: new Map(),
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
      };

      const result = await useCase.execute(command);

      expect(result.createOrUpdate).toHaveLength(3);
    });
  });
});
