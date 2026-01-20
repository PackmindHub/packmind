import { RecipeVersionService } from './RecipeVersionService';
import { IRecipeVersionRepository } from '../../domain/repositories/IRecipeVersionRepository';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { recipeVersionFactory } from '../../../test/recipeVersionFactory';
import {
  createRecipeId,
  createRecipeVersionId,
  createUserId,
  RecipeVersion,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

describe('RecipeVersionService', () => {
  let service: RecipeVersionService;
  let mockRepository: jest.Mocked<IRecipeVersionRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockRepository = {
      add: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByRecipeId: jest.fn(),
      findLatestByRecipeId: jest.fn(),
      findByRecipeIdAndVersion: jest.fn(),
    } as unknown as jest.Mocked<IRecipeVersionRepository>;

    stubbedLogger = stubLogger();
  });

  describe('addRecipeVersion', () => {
    describe('when input data is provided', () => {
      beforeEach(() => {
        service = new RecipeVersionService(mockRepository, stubbedLogger);
      });

      let inputData: Omit<RecipeVersion, 'id'>;
      let savedVersion: RecipeVersion;
      let result: RecipeVersion;

      beforeEach(async () => {
        inputData = {
          recipeId: createRecipeId(uuidv4()),
          name: 'Test Recipe',
          slug: 'test-recipe',
          content: 'Test recipe content for summary generation',
          version: 1,
          summary: 'Pre-generated summary from use case',
          userId: createUserId(uuidv4()),
        };

        savedVersion = {
          id: createRecipeVersionId(uuidv4()),
          ...inputData,
        };

        mockRepository.add.mockResolvedValue(savedVersion);

        result = await service.addRecipeVersion(inputData);
      });

      it('saves version with provided summary', () => {
        expect(mockRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            ...inputData,
          }),
        );
      });

      it('returns the saved version', () => {
        expect(result).toEqual(savedVersion);
      });

      it('calls repository.add exactly once', () => {
        expect(mockRepository.add).toHaveBeenCalledTimes(1);
      });
    });

    describe('when summary generation fails', () => {
      beforeEach(() => {
        service = new RecipeVersionService(mockRepository, stubbedLogger);
      });

      let inputData: Omit<RecipeVersion, 'id'>;
      let savedVersion: RecipeVersion;
      let result: RecipeVersion;

      beforeEach(async () => {
        inputData = {
          recipeId: createRecipeId(uuidv4()),
          name: 'Test Recipe',
          slug: 'test-recipe',
          content: 'Test recipe content',
          version: 1,
          summary: null, // No summary provided
          userId: createUserId(uuidv4()),
        };

        savedVersion = {
          id: createRecipeVersionId(uuidv4()),
          ...inputData,
        };

        mockRepository.add.mockResolvedValue(savedVersion);

        result = await service.addRecipeVersion(inputData);
      });

      it('saves version without summary', () => {
        expect(mockRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            ...inputData,
            summary: null,
          }),
        );
      });

      it('returns version with null summary', () => {
        expect(result).toEqual(savedVersion);
      });

      it('calls repository.add only once', () => {
        expect(mockRepository.add).toHaveBeenCalledTimes(1);
      });

      it('returns version without summary', () => {
        expect(result).toEqual(savedVersion);
      });

      it('returns version with null summary on generation failure', () => {
        expect(result.summary).toBeNull();
      });
    });
  });

  describe('listRecipeVersions', () => {
    let recipeId: ReturnType<typeof createRecipeId>;
    let versions: RecipeVersion[];
    let result: RecipeVersion[];

    beforeEach(async () => {
      service = new RecipeVersionService(mockRepository, stubbedLogger);
      recipeId = createRecipeId(uuidv4());
      versions = [recipeVersionFactory(), recipeVersionFactory()];

      mockRepository.findByRecipeId.mockResolvedValue(versions);

      result = await service.listRecipeVersions(recipeId);
    });

    it('calls repository with recipe id', () => {
      expect(mockRepository.findByRecipeId).toHaveBeenCalledWith(recipeId);
    });

    it('returns versions from repository', () => {
      expect(result).toEqual(versions);
    });
  });

  describe('getRecipeVersion', () => {
    let recipeId: ReturnType<typeof createRecipeId>;
    let version: number;
    let recipeVersion: RecipeVersion;
    let result: RecipeVersion | null;

    beforeEach(async () => {
      service = new RecipeVersionService(mockRepository, stubbedLogger);
      recipeId = createRecipeId(uuidv4());
      version = 1;
      recipeVersion = recipeVersionFactory();

      mockRepository.findByRecipeIdAndVersion.mockResolvedValue(recipeVersion);

      result = await service.getRecipeVersion(recipeId, version);
    });

    it('calls repository with recipe id and version', () => {
      expect(mockRepository.findByRecipeIdAndVersion).toHaveBeenCalledWith(
        recipeId,
        version,
      );
    });

    it('returns version from repository', () => {
      expect(result).toEqual(recipeVersion);
    });
  });
});
