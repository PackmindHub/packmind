import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  OrganizationId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../test/standardFactory';
import {
  createStandardId,
  Standard,
  StandardId,
} from '../../domain/entities/Standard';
import { IStandardRepository } from '../../domain/repositories/IStandardRepository';
import {
  CreateStandardData,
  StandardService,
  UpdateStandardData,
} from './StandardService';

describe('StandardService', () => {
  let standardService: StandardService;
  let standardRepository: IStandardRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByOrganizationId: jest.fn(),
      findBySpaceId: jest.fn(),
      findByUserId: jest.fn(),
      findByOrganizationAndUser: jest.fn(),
    };

    stubbedLogger = stubLogger();

    standardService = new StandardService(standardRepository, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addStandard', () => {
    let standardData: CreateStandardData;
    let savedStandard: Standard;
    let result: Standard;

    beforeEach(async () => {
      standardData = {
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Test standard description',
        version: 1,
        gitCommit: undefined,
        userId: createUserId(uuidv4()),
        scope: null,
        spaceId: createSpaceId(uuidv4()),
      };

      savedStandard = {
        id: createStandardId(uuidv4()),
        ...standardData,
        scope: null,
      };

      standardRepository.add = jest.fn().mockResolvedValue(savedStandard);

      result = await standardService.addStandard(standardData);
    });

    it('creates a new standard with generated ID', () => {
      expect(standardRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: standardData.name,
          slug: standardData.slug,
          description: standardData.description,
          version: standardData.version,
        }),
      );
    });

    it('returns the created standard', () => {
      expect(result).toEqual(savedStandard);
    });
  });

  describe('getStandardById', () => {
    describe('when the standard exists', () => {
      let standardId: StandardId;
      let standard: Standard;
      let result: Standard | null;

      beforeEach(async () => {
        standardId = createStandardId(uuidv4());
        standard = standardFactory({ id: standardId });

        standardRepository.findById = jest.fn().mockResolvedValue(standard);

        result = await standardService.getStandardById(standardId);
      });

      it('calls repository with correct ID', () => {
        expect(standardRepository.findById).toHaveBeenCalledWith(standardId);
      });

      it('returns the found standard', () => {
        expect(result).toEqual(standard);
      });
    });

    describe('when the standard does not exist', () => {
      let nonExistentStandardId: StandardId;
      let result: Standard | null;

      beforeEach(async () => {
        nonExistentStandardId = createStandardId(uuidv4());
        standardRepository.findById = jest.fn().mockResolvedValue(null);

        result = await standardService.getStandardById(nonExistentStandardId);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('findStandardBySlug', () => {
    describe('when the standard exists', () => {
      let slug: string;
      let organizationId: OrganizationId;
      let standard: Standard;
      let result: Standard | null;

      beforeEach(async () => {
        slug = 'test-standard';
        organizationId = createOrganizationId('org-123');
        standard = standardFactory({ slug });

        standardRepository.findBySlug = jest.fn().mockResolvedValue(standard);

        result = await standardService.findStandardBySlug(slug, organizationId);
      });

      it('calls repository with correct slug and organizationId', () => {
        expect(standardRepository.findBySlug).toHaveBeenCalledWith(
          slug,
          organizationId,
        );
      });

      it('returns the found standard', () => {
        expect(result).toEqual(standard);
      });
    });

    describe('when the standard does not exist', () => {
      let nonExistentSlug: string;
      let organizationId: OrganizationId;
      let result: Standard | null;

      beforeEach(async () => {
        nonExistentSlug = 'non-existent-standard';
        organizationId = createOrganizationId('org-123');
        standardRepository.findBySlug = jest.fn().mockResolvedValue(null);

        result = await standardService.findStandardBySlug(
          nonExistentSlug,
          organizationId,
        );
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('updateStandard', () => {
    describe('when the standard exists', () => {
      let standardId: StandardId;
      let existingStandard: Standard;
      let updateData: UpdateStandardData;
      let updatedStandard: Standard;
      let result: Standard;

      beforeEach(async () => {
        standardId = createStandardId(uuidv4());
        existingStandard = standardFactory({ id: standardId, version: 1 });

        updateData = {
          name: 'Updated Standard',
          slug: 'updated-standard',
          description: 'Updated standard description',
          version: 2,
          gitCommit: undefined,
          userId: createUserId(uuidv4()),
          scope: null,
        };

        updatedStandard = {
          id: standardId,
          ...updateData,
          scope: null,
          spaceId: createSpaceId('space-1'),
        };

        standardRepository.findById = jest
          .fn()
          .mockResolvedValue(existingStandard);
        standardRepository.add = jest.fn().mockResolvedValue(updatedStandard);

        result = await standardService.updateStandard(standardId, updateData);
      });

      it('checks if the standard exists', () => {
        expect(standardRepository.findById).toHaveBeenCalledWith(standardId);
      });

      it('updates the standard with correct data', () => {
        expect(standardRepository.add).toHaveBeenCalledWith({
          id: standardId,
          ...updateData,
          scope: null,
          spaceId: existingStandard.spaceId,
        });
      });

      it('returns the updated standard', () => {
        expect(result).toEqual(updatedStandard);
      });
    });

    describe('when the standard does not exist', () => {
      let nonExistentStandardId: StandardId;
      let updateData: UpdateStandardData;

      beforeEach(() => {
        nonExistentStandardId = createStandardId(uuidv4());
        updateData = {
          name: 'Non-existent Standard',
          slug: 'non-existent-standard',
          description: 'This standard does not exist',
          version: 1,
          gitCommit: undefined,
          userId: createUserId(uuidv4()),
          scope: null,
        };

        standardRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          standardService.updateStandard(nonExistentStandardId, updateData),
        ).rejects.toThrow(
          `Standard with id ${nonExistentStandardId} not found`,
        );
      });
    });
  });

  describe('deleteStandard', () => {
    let userId: UserId;

    beforeEach(() => {
      userId = createUserId(uuidv4());
    });

    describe('when the standard exists', () => {
      let standardId: StandardId;
      let standard: Standard;

      beforeEach(async () => {
        standardId = createStandardId(uuidv4());
        standard = standardFactory({ id: standardId });

        standardRepository.findById = jest.fn().mockResolvedValue(standard);
        standardRepository.deleteById = jest.fn().mockResolvedValue(undefined);

        await standardService.deleteStandard(standardId, userId);
      });

      it('checks if the standard exists', () => {
        expect(standardRepository.findById).toHaveBeenCalledWith(standardId);
      });

      it('deletes the standard', () => {
        expect(standardRepository.deleteById).toHaveBeenCalledWith(
          standardId,
          userId,
        );
      });
    });

    describe('when the standard does not exist', () => {
      let nonExistentStandardId: StandardId;

      beforeEach(() => {
        nonExistentStandardId = createStandardId(uuidv4());
        standardRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          standardService.deleteStandard(nonExistentStandardId, userId),
        ).rejects.toThrow(
          `Standard with id ${nonExistentStandardId} not found`,
        );
      });

      it('does not call deleteById', async () => {
        try {
          await standardService.deleteStandard(nonExistentStandardId, userId);
        } catch {
          // Ignore error for this test
        }
        expect(standardRepository.deleteById).not.toHaveBeenCalled();
      });
    });
  });

  describe('listStandardsBySpace', () => {
    it('returns standards for the specified space', async () => {
      const spaceId = createSpaceId(uuidv4());
      const standards = [
        standardFactory({ spaceId }),
        standardFactory({ spaceId }),
      ];

      standardRepository.findBySpaceId = jest.fn().mockResolvedValue(standards);

      const result = await standardService.listStandardsBySpace(spaceId);

      expect(standardRepository.findBySpaceId).toHaveBeenCalledWith(spaceId);
      expect(result).toEqual(standards);
    });
  });

  describe('listStandardsByUser', () => {
    it('returns standards for the specified user', async () => {
      const userId = createUserId(uuidv4());
      const standards = [
        standardFactory({ userId }),
        standardFactory({ userId }),
      ];

      standardRepository.findByUserId = jest.fn().mockResolvedValue(standards);

      const result = await standardService.listStandardsByUser(userId);

      expect(standardRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(standards);
    });
  });

  describe('listStandardsByOrganizationAndUser', () => {
    it('returns standards for the specified organization and user', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const standards = [
        standardFactory({ userId }),
        standardFactory({ userId }),
      ];

      standardRepository.findByOrganizationAndUser = jest
        .fn()
        .mockResolvedValue(standards);

      const result = await standardService.listStandardsByOrganizationAndUser(
        organizationId,
        userId,
      );

      expect(standardRepository.findByOrganizationAndUser).toHaveBeenCalledWith(
        organizationId,
        userId,
      );
      expect(result).toEqual(standards);
    });
  });
});
