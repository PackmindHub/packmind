import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  TriggerFullReembeddingCommand,
  createOrganizationId,
  createUserId,
  createSpaceId,
  createStandardVersionId,
  createRecipeVersionId,
  ISpacesPort,
  IStandardsPort,
  IRecipesPort,
  Space,
  StandardVersion,
  RecipeVersion,
  StandardVersionId,
  RecipeVersionId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { TriggerFullReembeddingUseCase } from './TriggerFullReembeddingUseCase';

describe('TriggerFullReembeddingUseCase', () => {
  let useCase: TriggerFullReembeddingUseCase;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockEnqueueStandardEmbedding: jest.Mock<
    Promise<void>,
    [StandardVersionId]
  >;
  let mockEnqueueRecipeEmbedding: jest.Mock<Promise<void>, [RecipeVersionId]>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockSpacesPort = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockStandardsPort = {
      findAllLatestStandardVersions: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockRecipesPort = {
      findAllLatestRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockEnqueueStandardEmbedding = jest.fn().mockResolvedValue(undefined);
    mockEnqueueRecipeEmbedding = jest.fn().mockResolvedValue(undefined);

    stubbedLogger = stubLogger();

    useCase = new TriggerFullReembeddingUseCase(
      mockSpacesPort,
      mockStandardsPort,
      mockRecipesPort,
      mockEnqueueStandardEmbedding,
      mockEnqueueRecipeEmbedding,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('triggers re-embedding for all standards and recipes across all spaces', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const space1Id = createSpaceId(uuidv4());
      const space2Id = createSpaceId(uuidv4());

      const command: TriggerFullReembeddingCommand = {
        organizationId,
        userId,
      };

      // Mock spaces
      const spaces: Space[] = [
        {
          id: space1Id,
          name: 'Space 1',
          slug: 'space-1',
          organizationId,
        },
        {
          id: space2Id,
          name: 'Space 2',
          slug: 'space-2',
          organizationId,
        },
      ];

      // Mock standard versions for space 1
      const standard1VersionId = createStandardVersionId(uuidv4());
      const standardVersions1: StandardVersion[] = [
        { id: standard1VersionId } as StandardVersion,
      ];

      // Mock standard versions for space 2
      const standard2VersionId = createStandardVersionId(uuidv4());
      const standardVersions2: StandardVersion[] = [
        { id: standard2VersionId } as StandardVersion,
      ];

      // Mock recipe versions for space 1
      const recipe1VersionId = createRecipeVersionId(uuidv4());
      const recipeVersions1: RecipeVersion[] = [
        { id: recipe1VersionId } as RecipeVersion,
      ];

      // Mock recipe versions for space 2
      const recipe2VersionId = createRecipeVersionId(uuidv4());
      const recipeVersions2: RecipeVersion[] = [
        { id: recipe2VersionId } as RecipeVersion,
      ];

      mockSpacesPort.listSpacesByOrganization.mockResolvedValue(spaces);

      mockStandardsPort.findAllLatestStandardVersions
        .mockResolvedValueOnce(standardVersions1)
        .mockResolvedValueOnce(standardVersions2);

      mockRecipesPort.findAllLatestRecipeVersions
        .mockResolvedValueOnce(recipeVersions1)
        .mockResolvedValueOnce(recipeVersions2);

      const result = await useCase.execute(command);

      expect(mockSpacesPort.listSpacesByOrganization).toHaveBeenCalledWith(
        organizationId,
      );
      expect(
        mockStandardsPort.findAllLatestStandardVersions,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockStandardsPort.findAllLatestStandardVersions,
      ).toHaveBeenCalledWith(space1Id);
      expect(
        mockStandardsPort.findAllLatestStandardVersions,
      ).toHaveBeenCalledWith(space2Id);

      expect(mockRecipesPort.findAllLatestRecipeVersions).toHaveBeenCalledTimes(
        2,
      );
      expect(mockRecipesPort.findAllLatestRecipeVersions).toHaveBeenCalledWith(
        space1Id,
      );
      expect(mockRecipesPort.findAllLatestRecipeVersions).toHaveBeenCalledWith(
        space2Id,
      );

      expect(mockEnqueueStandardEmbedding).toHaveBeenCalledWith(
        standard1VersionId,
      );
      expect(mockEnqueueStandardEmbedding).toHaveBeenCalledWith(
        standard2VersionId,
      );
      expect(mockEnqueueRecipeEmbedding).toHaveBeenCalledWith(recipe1VersionId);
      expect(mockEnqueueRecipeEmbedding).toHaveBeenCalledWith(recipe2VersionId);

      expect(result).toEqual({
        standardVersionsQueued: 2,
        recipeVersionsQueued: 2,
        totalQueued: 4,
      });

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Triggering full re-embedding for organization',
        expect.objectContaining({ organizationId, userId }),
      );
      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Full re-embedding triggered successfully',
        expect.objectContaining({
          organizationId,
          standardVersionsQueued: 2,
          recipeVersionsQueued: 2,
          totalQueued: 4,
        }),
      );
    });

    it('handles spaces with no standards or recipes', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const spaceId = createSpaceId(uuidv4());

      const command: TriggerFullReembeddingCommand = {
        organizationId,
        userId,
      };

      const spaces: Space[] = [
        {
          id: spaceId,
          name: 'Empty Space',
          slug: 'empty-space',
          organizationId,
        },
      ];

      mockSpacesPort.listSpacesByOrganization.mockResolvedValue(spaces);
      mockStandardsPort.findAllLatestStandardVersions.mockResolvedValue([]);
      mockRecipesPort.findAllLatestRecipeVersions.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        standardVersionsQueued: 0,
        recipeVersionsQueued: 0,
        totalQueued: 0,
      });

      expect(mockEnqueueStandardEmbedding).not.toHaveBeenCalled();
      expect(mockEnqueueRecipeEmbedding).not.toHaveBeenCalled();
    });

    it('continues processing even if some items fail to enqueue', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const spaceId = createSpaceId(uuidv4());

      const command: TriggerFullReembeddingCommand = {
        organizationId,
        userId,
      };

      const spaces: Space[] = [
        {
          id: spaceId,
          name: 'Space',
          slug: 'space',
          organizationId,
        },
      ];

      const standard1VersionId = createStandardVersionId(uuidv4());
      const standard2VersionId = createStandardVersionId(uuidv4());

      const standardVersions: StandardVersion[] = [
        { id: standard1VersionId } as StandardVersion,
        { id: standard2VersionId } as StandardVersion,
      ];

      mockSpacesPort.listSpacesByOrganization.mockResolvedValue(spaces);
      mockStandardsPort.findAllLatestStandardVersions.mockResolvedValue(
        standardVersions,
      );
      mockRecipesPort.findAllLatestRecipeVersions.mockResolvedValue([]);

      // First standard succeeds, second fails
      mockEnqueueStandardEmbedding
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed to enqueue'));

      const result = await useCase.execute(command);

      // Should still enqueue both standards (errors are caught)
      expect(mockEnqueueStandardEmbedding).toHaveBeenCalledWith(
        standard1VersionId,
      );
      expect(mockEnqueueStandardEmbedding).toHaveBeenCalledWith(
        standard2VersionId,
      );
      expect(result.standardVersionsQueued).toBe(1);
      expect(result.totalQueued).toBe(1);

      expect(stubbedLogger.warn).toHaveBeenCalledWith(
        'Failed to enqueue standard for re-embedding',
        expect.objectContaining({
          versionId: standard2VersionId,
          error: 'Failed to enqueue',
        }),
      );
    });

    it('handles organization with no spaces', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      const command: TriggerFullReembeddingCommand = {
        organizationId,
        userId,
      };

      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        standardVersionsQueued: 0,
        recipeVersionsQueued: 0,
        totalQueued: 0,
      });

      expect(
        mockStandardsPort.findAllLatestStandardVersions,
      ).not.toHaveBeenCalled();
      expect(
        mockRecipesPort.findAllLatestRecipeVersions,
      ).not.toHaveBeenCalled();
    });
  });
});
