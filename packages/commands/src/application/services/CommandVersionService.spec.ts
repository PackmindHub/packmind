import { CommandVersionService } from './CommandVersionService';
import { ICommandVersionRepository } from '../../domain/repositories/ICommandVersionRepository';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { commandVersionFactory } from '../../../test/commandVersionFactory';
import {
  createCommandId,
  createCommandVersionId,
  createSpaceId,
  createUserId,
  CommandVersion,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

describe('RecipeVersionService', () => {
  let service: CommandVersionService;
  let mockRepository: jest.Mocked<ICommandVersionRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockRepository = {
      add: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByCommandId: jest.fn(),
      findLatestByCommandId: jest.fn(),
      findByCommandIdAndVersion: jest.fn(),
    } as unknown as jest.Mocked<ICommandVersionRepository>;

    stubbedLogger = stubLogger();
  });

  describe('addRecipeVersion', () => {
    describe('when input data is provided', () => {
      beforeEach(() => {
        service = new CommandVersionService(mockRepository, stubbedLogger);
      });

      let inputData: Omit<CommandVersion, 'id'>;
      let savedVersion: CommandVersion;
      let result: CommandVersion;

      beforeEach(async () => {
        inputData = {
          recipeId: createCommandId(uuidv4()),
          name: 'Test Recipe',
          slug: 'test-recipe',
          content: 'Test recipe content for summary generation',
          version: 1,
          summary: 'Pre-generated summary from use case',
          userId: createUserId(uuidv4()),
        };

        savedVersion = {
          id: createCommandVersionId(uuidv4()),
          ...inputData,
        };

        mockRepository.add.mockResolvedValue(savedVersion);

        result = await service.addCommandVersion(inputData);
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
        service = new CommandVersionService(mockRepository, stubbedLogger);
      });

      let inputData: Omit<CommandVersion, 'id'>;
      let savedVersion: CommandVersion;
      let result: CommandVersion;

      beforeEach(async () => {
        inputData = {
          recipeId: createCommandId(uuidv4()),
          name: 'Test Recipe',
          slug: 'test-recipe',
          content: 'Test recipe content',
          version: 1,
          summary: null, // No summary provided
          userId: createUserId(uuidv4()),
        };

        savedVersion = {
          id: createCommandVersionId(uuidv4()),
          ...inputData,
        };

        mockRepository.add.mockResolvedValue(savedVersion);

        result = await service.addCommandVersion(inputData);
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
    let recipeId: ReturnType<typeof createCommandId>;
    let versions: CommandVersion[];
    let result: CommandVersion[];

    beforeEach(async () => {
      service = new CommandVersionService(mockRepository, stubbedLogger);
      recipeId = createCommandId(uuidv4());
      versions = [commandVersionFactory(), commandVersionFactory()];

      mockRepository.findByCommandId.mockResolvedValue(versions);

      result = await service.listCommandVersions(recipeId);
    });

    it('calls repository with recipe id', () => {
      expect(mockRepository.findByCommandId).toHaveBeenCalledWith(recipeId);
    });

    it('returns versions from repository', () => {
      expect(result).toEqual(versions);
    });
  });

  describe('getRecipeVersion', () => {
    describe('when called with allowedSpaceIds', () => {
      let recipeId: ReturnType<typeof createCommandId>;
      let allowedSpaceIds: ReturnType<typeof createSpaceId>[];
      let version: number;
      let recipeVersion: CommandVersion;
      let result: CommandVersion | null;

      beforeEach(async () => {
        service = new CommandVersionService(mockRepository, stubbedLogger);
        recipeId = createCommandId(uuidv4());
        allowedSpaceIds = [createSpaceId(uuidv4()), createSpaceId(uuidv4())];
        version = 1;
        recipeVersion = commandVersionFactory();

        mockRepository.findByCommandIdAndVersion.mockResolvedValue(
          recipeVersion,
        );

        result = await service.getCommandVersion(
          recipeId,
          version,
          allowedSpaceIds,
        );
      });

      it('calls repository with recipe id, version, and allowedSpaceIds', () => {
        expect(mockRepository.findByCommandIdAndVersion).toHaveBeenCalledWith(
          recipeId,
          version,
          allowedSpaceIds,
        );
      });

      it('returns version from repository', () => {
        expect(result).toEqual(recipeVersion);
      });
    });
  });
});
