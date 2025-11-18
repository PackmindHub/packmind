import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { AIService } from '@packmind/node-utils';
import {
  IStandardsPort,
  IRecipesPort,
  StandardVersion,
  RecipeVersion,
  createStandardVersionId,
  createRecipeVersionId,
  createStandardId,
  createRecipeId,
  createSpaceId,
  createRuleId,
} from '@packmind/types';
import { standardVersionFactory } from '@packmind/standards/test';
import { recipeVersionFactory } from '@packmind/recipes/test';
import { EmbeddingOrchestrationService } from './EmbeddingOrchestrationService';
import { v4 as uuidv4 } from 'uuid';

describe('EmbeddingOrchestrationService', () => {
  let service: EmbeddingOrchestrationService;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockAIService: jest.Mocked<AIService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Create mock ports with all required methods
    mockStandardsPort = {
      getStandardVersionById: jest.fn(),
      updateStandardVersionEmbedding: jest.fn(),
      findLatestStandardVersionsWithoutEmbedding: jest.fn(),
      findSimilarStandardsByEmbedding: jest.fn(),
      getStandard: jest.fn(),
      getStandardVersion: jest.fn(),
      getLatestStandardVersion: jest.fn(),
      listStandardVersions: jest.fn(),
      getRule: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      findStandardBySlug: jest.fn(),
      addRuleToStandard: jest.fn(),
      updateStandardRules: jest.fn(),
    } as jest.Mocked<IStandardsPort>;

    mockRecipesPort = {
      getRecipeVersionById: jest.fn(),
      updateRecipeVersionEmbedding: jest.fn(),
      findLatestRecipeVersionsWithoutEmbedding: jest.fn(),
      findSimilarRecipesByEmbedding: jest.fn(),
      captureRecipe: jest.fn(),
      deleteRecipe: jest.fn(),
      deleteRecipesBatch: jest.fn(),
      getRecipeById: jest.fn(),
      getRecipeByIdInternal: jest.fn(),
      findRecipeBySlug: jest.fn(),
      listRecipesByOrganization: jest.fn(),
      listRecipesBySpace: jest.fn(),
      listRecipeVersions: jest.fn(),
      getRecipeVersion: jest.fn(),
      updateRecipesFromGitHub: jest.fn(),
      updateRecipesFromGitLab: jest.fn(),
      updateRecipeFromUI: jest.fn(),
    } as jest.Mocked<IRecipesPort>;

    stubbedLogger = stubLogger();

    service = new EmbeddingOrchestrationService(
      mockStandardsPort,
      mockRecipesPort,
      stubbedLogger,
    );

    // Mock the AIService instance that gets created internally
    mockAIService = {
      isConfigured: jest.fn(),
      executePrompt: jest.fn(),
      executePromptWithHistory: jest.fn(),
      generateEmbedding: jest.fn(),
      generateEmbeddings: jest.fn(),
    } as jest.Mocked<AIService>;

    // Replace the internal aiService with our mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).aiService = mockAIService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAndSaveStandardEmbedding', () => {
    it('generates and saves embedding for standard version', async () => {
      const versionId = createStandardVersionId(uuidv4());
      const mockVersion: StandardVersion = standardVersionFactory({
        id: versionId,
        standardId: createStandardId(uuidv4()),
        name: 'Test Standard',
        description: 'Test description',
        rules: [
          {
            id: createRuleId(uuidv4()),
            standardVersionId: versionId,
            content: 'Rule 1',
          },
        ],
      });
      const embedding = new Array(1536).fill(0.1);

      mockStandardsPort.getStandardVersionById.mockResolvedValue(mockVersion);
      mockAIService.generateEmbedding.mockResolvedValue(embedding);
      mockStandardsPort.updateStandardVersionEmbedding.mockResolvedValue();

      await service.generateAndSaveStandardEmbedding(versionId);

      expect(mockStandardsPort.getStandardVersionById).toHaveBeenCalledWith(
        versionId,
      );
      expect(mockAIService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Test Standard'),
      );
      expect(
        mockStandardsPort.updateStandardVersionEmbedding,
      ).toHaveBeenCalledWith(versionId, embedding);
    });

    it('throws error when standard version not found', async () => {
      const versionId = createStandardVersionId(uuidv4());
      mockStandardsPort.getStandardVersionById.mockResolvedValue(null);

      await expect(
        service.generateAndSaveStandardEmbedding(versionId),
      ).rejects.toThrow(`StandardVersion ${versionId} not found`);

      expect(mockAIService.generateEmbedding).not.toHaveBeenCalled();
      expect(
        mockStandardsPort.updateStandardVersionEmbedding,
      ).not.toHaveBeenCalled();
    });

    it('throws error when AI service returns empty embedding', async () => {
      const versionId = createStandardVersionId(uuidv4());
      const mockVersion: StandardVersion = standardVersionFactory({
        id: versionId,
      });

      mockStandardsPort.getStandardVersionById.mockResolvedValue(mockVersion);
      mockAIService.generateEmbedding.mockResolvedValue([]);

      await expect(
        service.generateAndSaveStandardEmbedding(versionId),
      ).rejects.toThrow(
        `Failed to generate embedding for standard version ${versionId}`,
      );

      expect(
        mockStandardsPort.updateStandardVersionEmbedding,
      ).not.toHaveBeenCalled();
    });

    it('logs correctly throughout the process', async () => {
      const versionId = createStandardVersionId(uuidv4());
      const mockVersion: StandardVersion = standardVersionFactory({
        id: versionId,
      });
      const embedding = new Array(1536).fill(0.1);

      mockStandardsPort.getStandardVersionById.mockResolvedValue(mockVersion);
      mockAIService.generateEmbedding.mockResolvedValue(embedding);
      mockStandardsPort.updateStandardVersionEmbedding.mockResolvedValue();

      await service.generateAndSaveStandardEmbedding(versionId);

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Generating embedding for standard version',
        { versionId },
      );
      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Standard embedding saved successfully',
        expect.objectContaining({ versionId, embeddingDimensions: 1536 }),
      );
    });
  });

  describe('generateAndSaveRecipeEmbedding', () => {
    it('generates and saves embedding for recipe version', async () => {
      const versionId = createRecipeVersionId(uuidv4());
      const mockVersion: RecipeVersion = recipeVersionFactory({
        id: versionId,
        recipeId: createRecipeId(uuidv4()),
        name: 'Test Recipe',
        content: 'Test content',
      });
      const embedding = new Array(1536).fill(0.1);

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(mockVersion);
      mockAIService.generateEmbedding.mockResolvedValue(embedding);
      mockRecipesPort.updateRecipeVersionEmbedding.mockResolvedValue();

      await service.generateAndSaveRecipeEmbedding(versionId);

      expect(mockRecipesPort.getRecipeVersionById).toHaveBeenCalledWith(
        versionId,
      );
      expect(mockAIService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Test Recipe'),
      );
      expect(mockRecipesPort.updateRecipeVersionEmbedding).toHaveBeenCalledWith(
        versionId,
        embedding,
      );
    });

    it('throws error when recipe version not found', async () => {
      const versionId = createRecipeVersionId(uuidv4());
      mockRecipesPort.getRecipeVersionById.mockResolvedValue(null);

      await expect(
        service.generateAndSaveRecipeEmbedding(versionId),
      ).rejects.toThrow(`RecipeVersion ${versionId} not found`);

      expect(mockAIService.generateEmbedding).not.toHaveBeenCalled();
      expect(
        mockRecipesPort.updateRecipeVersionEmbedding,
      ).not.toHaveBeenCalled();
    });

    it('throws error when AI service returns empty embedding', async () => {
      const versionId = createRecipeVersionId(uuidv4());
      const mockVersion: RecipeVersion = recipeVersionFactory({
        id: versionId,
      });

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(mockVersion);
      mockAIService.generateEmbedding.mockResolvedValue([]);

      await expect(
        service.generateAndSaveRecipeEmbedding(versionId),
      ).rejects.toThrow(
        `Failed to generate embedding for recipe version ${versionId}`,
      );

      expect(
        mockRecipesPort.updateRecipeVersionEmbedding,
      ).not.toHaveBeenCalled();
    });

    it('logs correctly throughout the process', async () => {
      const versionId = createRecipeVersionId(uuidv4());
      const mockVersion: RecipeVersion = recipeVersionFactory({
        id: versionId,
      });
      const embedding = new Array(1536).fill(0.1);

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(mockVersion);
      mockAIService.generateEmbedding.mockResolvedValue(embedding);
      mockRecipesPort.updateRecipeVersionEmbedding.mockResolvedValue();

      await service.generateAndSaveRecipeEmbedding(versionId);

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Generating embedding for recipe version',
        { versionId },
      );
      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Recipe embedding saved successfully',
        expect.objectContaining({ versionId, embeddingDimensions: 1536 }),
      );
    });
  });

  describe('findSimilarStandards', () => {
    it('delegates to port with correct parameters', async () => {
      const embedding = new Array(1536).fill(0.1);
      const spaceId = createSpaceId(uuidv4());
      const threshold = 0.8;
      const results = [
        { ...standardVersionFactory(), similarity: 0.9 },
        { ...standardVersionFactory(), similarity: 0.85 },
      ];

      mockStandardsPort.findSimilarStandardsByEmbedding.mockResolvedValue(
        results,
      );

      const result = await service.findSimilarStandards(
        embedding,
        spaceId,
        threshold,
      );

      expect(
        mockStandardsPort.findSimilarStandardsByEmbedding,
      ).toHaveBeenCalledWith(embedding, spaceId, threshold);
      expect(result).toEqual(results);
    });

    it('logs correctly with result count', async () => {
      const embedding = new Array(1536).fill(0.1);
      const results = [{ ...standardVersionFactory(), similarity: 0.9 }];

      mockStandardsPort.findSimilarStandardsByEmbedding.mockResolvedValue(
        results,
      );

      await service.findSimilarStandards(embedding);

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Similar standards found',
        expect.objectContaining({ count: 1 }),
      );
    });
  });

  describe('findSimilarRecipes', () => {
    it('delegates to port with correct parameters', async () => {
      const embedding = new Array(1536).fill(0.1);
      const spaceId = createSpaceId(uuidv4());
      const threshold = 0.8;
      const results = [
        { ...recipeVersionFactory(), similarity: 0.9 },
        { ...recipeVersionFactory(), similarity: 0.85 },
      ];

      mockRecipesPort.findSimilarRecipesByEmbedding.mockResolvedValue(results);

      const result = await service.findSimilarRecipes(
        embedding,
        spaceId,
        threshold,
      );

      expect(
        mockRecipesPort.findSimilarRecipesByEmbedding,
      ).toHaveBeenCalledWith(embedding, spaceId, threshold);
      expect(result).toEqual(results);
    });

    it('logs correctly with result count', async () => {
      const embedding = new Array(1536).fill(0.1);
      const results = [{ ...recipeVersionFactory(), similarity: 0.9 }];

      mockRecipesPort.findSimilarRecipesByEmbedding.mockResolvedValue(results);

      await service.findSimilarRecipes(embedding);

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Similar recipes found',
        expect.objectContaining({ count: 1 }),
      );
    });
  });

  describe('findArtifactsWithoutEmbeddings', () => {
    it('returns both standards and recipes without embeddings', async () => {
      const spaceId = createSpaceId(uuidv4());
      const standards = [standardVersionFactory(), standardVersionFactory()];
      const recipes = [recipeVersionFactory()];

      mockStandardsPort.findLatestStandardVersionsWithoutEmbedding.mockResolvedValue(
        standards,
      );
      mockRecipesPort.findLatestRecipeVersionsWithoutEmbedding.mockResolvedValue(
        recipes,
      );

      const result = await service.findArtifactsWithoutEmbeddings(spaceId);

      expect(
        mockStandardsPort.findLatestStandardVersionsWithoutEmbedding,
      ).toHaveBeenCalledWith(spaceId);
      expect(
        mockRecipesPort.findLatestRecipeVersionsWithoutEmbedding,
      ).toHaveBeenCalledWith(spaceId);
      expect(result).toEqual({ standards, recipes });
    });

    it('fetches both domains in parallel', async () => {
      const standards = [standardVersionFactory()];
      const recipes = [recipeVersionFactory()];

      mockStandardsPort.findLatestStandardVersionsWithoutEmbedding.mockResolvedValue(
        standards,
      );
      mockRecipesPort.findLatestRecipeVersionsWithoutEmbedding.mockResolvedValue(
        recipes,
      );

      await service.findArtifactsWithoutEmbeddings();

      expect(
        mockStandardsPort.findLatestStandardVersionsWithoutEmbedding,
      ).toHaveBeenCalled();
      expect(
        mockRecipesPort.findLatestRecipeVersionsWithoutEmbedding,
      ).toHaveBeenCalled();
    });

    it('logs correctly with counts', async () => {
      const standards = [standardVersionFactory(), standardVersionFactory()];
      const recipes = [recipeVersionFactory()];

      mockStandardsPort.findLatestStandardVersionsWithoutEmbedding.mockResolvedValue(
        standards,
      );
      mockRecipesPort.findLatestRecipeVersionsWithoutEmbedding.mockResolvedValue(
        recipes,
      );

      await service.findArtifactsWithoutEmbeddings();

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Artifacts without embeddings found',
        expect.objectContaining({ standardsCount: 2, recipesCount: 1 }),
      );
    });
  });
});
