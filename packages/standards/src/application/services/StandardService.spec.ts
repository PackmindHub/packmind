import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createStandardId,
  createUserId,
  OrganizationId,
  Standard,
  StandardId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { ruleFactory } from '../../../test/ruleFactory';
import { ruleExampleFactory } from '../../../test/ruleExampleFactory';
import { IStandardRepository } from '../../domain/repositories/IStandardRepository';
import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import { IRuleRepository } from '../../domain/repositories/IRuleRepository';
import { IRuleExampleRepository } from '../../domain/repositories/IRuleExampleRepository';
import {
  CreateStandardData,
  StandardService,
  UpdateStandardData,
} from './StandardService';

describe('StandardService', () => {
  let standardService: StandardService;
  let standardRepository: IStandardRepository;
  let standardVersionRepository: IStandardVersionRepository;
  let ruleRepository: IRuleRepository;
  let ruleExampleRepository: IRuleExampleRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findBySpaceId: jest.fn(),
      findByUserId: jest.fn(),
      markAsMoved: jest.fn(),
    };

    standardVersionRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
      findByStandardId: jest.fn(),
      findLatestByStandardId: jest.fn(),
      findByStandardIdAndVersion: jest.fn(),
      updateSummary: jest.fn(),
    };

    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByStandardVersionId: jest.fn(),
    };

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByRuleId: jest.fn(),
      updateById: jest.fn(),
    };

    stubbedLogger = stubLogger();

    standardService = new StandardService(
      standardRepository,
      standardVersionRepository,
      ruleRepository,
      ruleExampleRepository,
      stubbedLogger,
    );
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
        movedTo: null,
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
          movedTo: null,
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
          movedTo: existingStandard.movedTo,
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
    let spaceId: ReturnType<typeof createSpaceId>;
    let standards: Standard[];
    let result: Standard[];

    beforeEach(async () => {
      spaceId = createSpaceId(uuidv4());
      standards = [standardFactory({ spaceId }), standardFactory({ spaceId })];

      standardRepository.findBySpaceId = jest.fn().mockResolvedValue(standards);

      result = await standardService.listStandardsBySpace(spaceId);
    });

    it('calls repository with correct spaceId', () => {
      expect(standardRepository.findBySpaceId).toHaveBeenCalledWith(
        spaceId,
        undefined,
      );
    });

    it('returns standards for the specified space', () => {
      expect(result).toEqual(standards);
    });
  });

  describe('listStandardsByUser', () => {
    let userId: UserId;
    let standards: Standard[];
    let result: Standard[];

    beforeEach(async () => {
      userId = createUserId(uuidv4());
      standards = [standardFactory({ userId }), standardFactory({ userId })];

      standardRepository.findByUserId = jest.fn().mockResolvedValue(standards);

      result = await standardService.listStandardsByUser(userId);
    });

    it('calls repository with correct userId', () => {
      expect(standardRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('returns standards for the specified user', () => {
      expect(result).toEqual(standards);
    });
  });

  describe('markStandardAsMoved', () => {
    const destinationSpaceId = createSpaceId(uuidv4());

    describe('when the standard exists', () => {
      let standardId: StandardId;
      let standard: Standard;

      beforeEach(async () => {
        standardId = createStandardId(uuidv4());
        standard = standardFactory({ id: standardId });

        standardRepository.findById = jest.fn().mockResolvedValue(standard);
        standardRepository.markAsMoved = jest.fn().mockResolvedValue(undefined);

        await standardService.markStandardAsMoved(
          standardId,
          destinationSpaceId,
        );
      });

      it('checks if the standard exists', () => {
        expect(standardRepository.findById).toHaveBeenCalledWith(standardId);
      });

      it('calls markAsMoved on repository with correct args', () => {
        expect(standardRepository.markAsMoved).toHaveBeenCalledWith(
          standardId,
          destinationSpaceId,
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
          standardService.markStandardAsMoved(
            nonExistentStandardId,
            destinationSpaceId,
          ),
        ).rejects.toThrow(
          `Standard with id ${nonExistentStandardId} not found`,
        );
      });
    });
  });

  describe('duplicateStandardToSpace', () => {
    const destinationSpaceId = createSpaceId(uuidv4());
    const newUserId = createUserId(uuidv4());

    describe('when the standard exists', () => {
      let standardId: StandardId;
      let original: Standard;
      let savedStandard: Standard;
      let version: ReturnType<typeof standardVersionFactory>;
      let rule: ReturnType<typeof ruleFactory>;
      let example: ReturnType<typeof ruleExampleFactory>;

      beforeEach(async () => {
        standardId = createStandardId(uuidv4());
        original = standardFactory({ id: standardId });

        version = standardVersionFactory({ standardId });
        rule = ruleFactory({ standardVersionId: version.id });
        example = ruleExampleFactory({ ruleId: rule.id });

        savedStandard = standardFactory({
          name: original.name,
          slug: original.slug,
          description: original.description,
          userId: newUserId,
          spaceId: destinationSpaceId,
          movedTo: null,
        });

        standardRepository.findById = jest.fn().mockResolvedValue(original);
        standardRepository.add = jest.fn().mockResolvedValue(savedStandard);
        standardVersionRepository.findByStandardId = jest
          .fn()
          .mockResolvedValue([version]);
        standardVersionRepository.add = jest.fn().mockResolvedValue(version);
        ruleRepository.findByStandardVersionId = jest
          .fn()
          .mockResolvedValue([rule]);
        ruleRepository.add = jest.fn().mockResolvedValue(rule);
        ruleExampleRepository.findByRuleId = jest
          .fn()
          .mockResolvedValue([example]);
        ruleExampleRepository.add = jest.fn().mockResolvedValue(example);
      });

      it('creates a new standard in the destination space', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(standardRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            name: original.name,
            slug: original.slug,
            description: original.description,
            spaceId: destinationSpaceId,
            userId: newUserId,
            movedTo: null,
          }),
        );
      });

      it('copies all versions linked to the new standard', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(standardVersionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            name: version.name,
            slug: version.slug,
            description: version.description,
            version: version.version,
          }),
        );
      });

      it('copies all rules linked to the new versions', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(ruleRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            content: rule.content,
          }),
        );
      });

      it('copies all examples linked to the new rules', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(ruleExampleRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            lang: example.lang,
            positive: example.positive,
            negative: example.negative,
          }),
        );
      });

      it('returns the duplicated standard', async () => {
        const result = await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(result.standard).toEqual(savedStandard);
      });

      it('returns the rule mappings', async () => {
        const result = await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(result.ruleMappings).toEqual([
          expect.objectContaining({
            oldRuleId: rule.id,
            newRuleId: expect.any(String),
          }),
        ]);
      });

      it('uses the provided newUserId for the duplicated standard', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(standardRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: newUserId,
          }),
        );
      });

      it('sets movedTo to null on the duplicated standard', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(standardRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            movedTo: null,
          }),
        );
      });
    });

    describe('when the standard has multiple versions with multiple rules', () => {
      let standardId: StandardId;
      let original: Standard;

      let version1: ReturnType<typeof standardVersionFactory>;
      let version2: ReturnType<typeof standardVersionFactory>;
      let rule1v1: ReturnType<typeof ruleFactory>;
      let rule2v1: ReturnType<typeof ruleFactory>;
      let rule1v2: ReturnType<typeof ruleFactory>;
      let rule2v2: ReturnType<typeof ruleFactory>;
      let example1: ReturnType<typeof ruleExampleFactory>;
      let example2: ReturnType<typeof ruleExampleFactory>;
      let example3: ReturnType<typeof ruleExampleFactory>;
      let example4: ReturnType<typeof ruleExampleFactory>;

      beforeEach(() => {
        standardId = createStandardId(uuidv4());
        original = standardFactory({ id: standardId });

        version1 = standardVersionFactory({ standardId, version: 1 });
        version2 = standardVersionFactory({ standardId, version: 2 });

        rule1v1 = ruleFactory({ standardVersionId: version1.id });
        rule2v1 = ruleFactory({ standardVersionId: version1.id });
        rule1v2 = ruleFactory({ standardVersionId: version2.id });
        rule2v2 = ruleFactory({ standardVersionId: version2.id });

        example1 = ruleExampleFactory({ ruleId: rule1v1.id });
        example2 = ruleExampleFactory({ ruleId: rule2v1.id });
        example3 = ruleExampleFactory({ ruleId: rule1v2.id });
        example4 = ruleExampleFactory({ ruleId: rule2v2.id });

        standardRepository.findById = jest.fn().mockResolvedValue(original);
        standardRepository.add = jest.fn().mockResolvedValue(original);
        standardVersionRepository.findByStandardId = jest
          .fn()
          .mockResolvedValue([version1, version2]);
        standardVersionRepository.add = jest.fn().mockResolvedValue(version1);
        ruleRepository.findByStandardVersionId = jest
          .fn()
          .mockImplementation((versionId) => {
            if (versionId === version1.id)
              return Promise.resolve([rule1v1, rule2v1]);
            if (versionId === version2.id)
              return Promise.resolve([rule1v2, rule2v2]);
            return Promise.resolve([]);
          });
        ruleRepository.add = jest.fn().mockResolvedValue(rule1v1);
        ruleExampleRepository.findByRuleId = jest
          .fn()
          .mockImplementation((ruleId) => {
            if (ruleId === rule1v1.id) return Promise.resolve([example1]);
            if (ruleId === rule2v1.id) return Promise.resolve([example2]);
            if (ruleId === rule1v2.id) return Promise.resolve([example3]);
            if (ruleId === rule2v2.id) return Promise.resolve([example4]);
            return Promise.resolve([]);
          });
        ruleExampleRepository.add = jest.fn().mockResolvedValue(example1);
      });

      it('copies all versions', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(standardVersionRepository.add).toHaveBeenCalledTimes(2);
      });

      it('copies all rules across versions', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(ruleRepository.add).toHaveBeenCalledTimes(4);
      });

      it('copies all examples across rules', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(ruleExampleRepository.add).toHaveBeenCalledTimes(4);
      });

      it('returns rule mappings for all rules', async () => {
        const result = await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(result.ruleMappings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ oldRuleId: rule1v1.id }),
            expect.objectContaining({ oldRuleId: rule2v1.id }),
            expect.objectContaining({ oldRuleId: rule1v2.id }),
            expect.objectContaining({ oldRuleId: rule2v2.id }),
          ]),
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
          standardService.duplicateStandardToSpace(
            nonExistentStandardId,
            destinationSpaceId,
            newUserId,
          ),
        ).rejects.toThrow(
          `Standard with id ${nonExistentStandardId} not found`,
        );
      });
    });

    describe('when the standard has no versions', () => {
      let standardId: StandardId;
      let original: Standard;
      let savedStandard: Standard;

      beforeEach(() => {
        standardId = createStandardId(uuidv4());
        original = standardFactory({ id: standardId });
        savedStandard = standardFactory({
          name: original.name,
          spaceId: destinationSpaceId,
          userId: newUserId,
          movedTo: null,
        });

        standardRepository.findById = jest.fn().mockResolvedValue(original);
        standardRepository.add = jest.fn().mockResolvedValue(savedStandard);
        standardVersionRepository.findByStandardId = jest
          .fn()
          .mockResolvedValue([]);
      });

      it('creates the standard', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(standardRepository.add).toHaveBeenCalledTimes(1);
      });

      it('does not create any versions', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(standardVersionRepository.add).not.toHaveBeenCalled();
      });

      it('does not create any rules', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(ruleRepository.add).not.toHaveBeenCalled();
      });

      it('does not create any examples', async () => {
        await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(ruleExampleRepository.add).not.toHaveBeenCalled();
      });

      it('returns empty rule mappings', async () => {
        const result = await standardService.duplicateStandardToSpace(
          standardId,
          destinationSpaceId,
          newUserId,
        );

        expect(result.ruleMappings).toEqual([]);
      });
    });
  });
});
