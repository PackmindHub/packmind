import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSkillId,
  createSpaceId,
  createUserId,
  OrganizationId,
  Skill,
  SkillId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../test/skillFactory';
import { skillVersionFactory } from '../../../test/skillVersionFactory';
import { skillFileFactory } from '../../../test/skillFileFactory';
import { ISkillRepository } from '../../domain/repositories/ISkillRepository';
import { ISkillVersionRepository } from '../../domain/repositories/ISkillVersionRepository';
import { ISkillFileRepository } from '../../domain/repositories/ISkillFileRepository';
import { CreateSkillData, SkillService, UpdateSkillData } from './SkillService';

describe('SkillService', () => {
  let skillService: SkillService;
  let skillRepository: ISkillRepository;
  let skillVersionRepository: ISkillVersionRepository;
  let skillFileRepository: ISkillFileRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    skillRepository = {
      add: jest.fn(),
      addMany: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findBySpaceId: jest.fn(),
      findByUserId: jest.fn(),
      markAsMoved: jest.fn(),
    };

    skillVersionRepository = {
      add: jest.fn(),
      addMany: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findBySkillId: jest.fn(),
      findLatestBySkillId: jest.fn(),
      findBySkillIdAndVersion: jest.fn(),
      updateMetadata: jest.fn(),
    };

    skillFileRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findBySkillVersionId: jest.fn(),
      addMany: jest.fn(),
    };

    stubbedLogger = stubLogger();

    skillService = new SkillService(
      skillRepository,
      skillVersionRepository,
      skillFileRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addSkill', () => {
    let skillData: CreateSkillData;
    let savedSkill: Skill;
    let result: Skill;

    beforeEach(async () => {
      skillData = {
        name: 'Test Skill',
        slug: 'test-skill',
        description: 'Test skill description',
        prompt: 'Test prompt',
        version: 1,
        userId: createUserId(uuidv4()),
        spaceId: createSpaceId(uuidv4()),
      };

      savedSkill = skillFactory(skillData);

      skillRepository.add = jest.fn().mockResolvedValue(savedSkill);

      result = await skillService.addSkill(skillData);
    });

    it('creates a new skill with generated ID', () => {
      expect(skillRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: skillData.name,
          slug: skillData.slug,
          description: skillData.description,
          prompt: skillData.prompt,
          version: skillData.version,
        }),
      );
    });

    it('returns the created skill', () => {
      expect(result).toEqual(savedSkill);
    });
  });

  describe('getSkillById', () => {
    describe('when the skill exists', () => {
      let skillId: SkillId;
      let skill: Skill;
      let result: Skill | null;

      beforeEach(async () => {
        skillId = createSkillId(uuidv4());
        skill = skillFactory({ id: skillId });

        skillRepository.findById = jest.fn().mockResolvedValue(skill);

        result = await skillService.getSkillById(skillId);
      });

      it('calls repository with correct ID', () => {
        expect(skillRepository.findById).toHaveBeenCalledWith(skillId);
      });

      it('returns the found skill', () => {
        expect(result).toEqual(skill);
      });
    });

    describe('when the skill does not exist', () => {
      let nonExistentSkillId: SkillId;
      let result: Skill | null;

      beforeEach(async () => {
        nonExistentSkillId = createSkillId(uuidv4());
        skillRepository.findById = jest.fn().mockResolvedValue(null);

        result = await skillService.getSkillById(nonExistentSkillId);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('findSkillBySlug', () => {
    describe('when the skill exists', () => {
      let slug: string;
      let organizationId: OrganizationId;
      let skill: Skill;
      let result: Skill | null;

      beforeEach(async () => {
        slug = 'test-skill';
        organizationId = createOrganizationId('org-123');
        skill = skillFactory({ slug });

        skillRepository.findBySlug = jest.fn().mockResolvedValue(skill);

        result = await skillService.findSkillBySlug(slug, organizationId);
      });

      it('calls repository with correct slug and organizationId', () => {
        expect(skillRepository.findBySlug).toHaveBeenCalledWith(
          slug,
          organizationId,
        );
      });

      it('returns the found skill', () => {
        expect(result).toEqual(skill);
      });
    });

    describe('when the skill does not exist', () => {
      let nonExistentSlug: string;
      let organizationId: OrganizationId;
      let result: Skill | null;

      beforeEach(async () => {
        nonExistentSlug = 'non-existent-skill';
        organizationId = createOrganizationId('org-123');
        skillRepository.findBySlug = jest.fn().mockResolvedValue(null);

        result = await skillService.findSkillBySlug(
          nonExistentSlug,
          organizationId,
        );
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('updateSkill', () => {
    describe('when the skill exists', () => {
      let skillId: SkillId;
      let existingSkill: Skill;
      let updateData: UpdateSkillData;
      let updatedSkill: Skill;
      let result: Skill;

      beforeEach(async () => {
        skillId = createSkillId(uuidv4());
        existingSkill = skillFactory({ id: skillId, version: 1 });

        updateData = {
          name: 'Updated Skill',
          slug: 'updated-skill',
          description: 'Updated description',
          prompt: 'Updated prompt',
          version: 2,
          userId: createUserId(uuidv4()),
        };

        updatedSkill = skillFactory({
          id: skillId,
          ...updateData,
          spaceId: existingSkill.spaceId,
          movedTo: existingSkill.movedTo,
        });

        skillRepository.findById = jest.fn().mockResolvedValue(existingSkill);
        skillRepository.add = jest.fn().mockResolvedValue(updatedSkill);

        result = await skillService.updateSkill(skillId, updateData);
      });

      it('checks if the skill exists', () => {
        expect(skillRepository.findById).toHaveBeenCalledWith(skillId);
      });

      it('returns the updated skill', () => {
        expect(result).toEqual(updatedSkill);
      });
    });

    describe('when the skill does not exist', () => {
      let nonExistentSkillId: SkillId;
      let updateData: UpdateSkillData;

      beforeEach(() => {
        nonExistentSkillId = createSkillId(uuidv4());
        updateData = {
          name: 'Non-existent Skill',
          slug: 'non-existent-skill',
          description: 'This skill does not exist',
          prompt: 'Prompt',
          version: 1,
          userId: createUserId(uuidv4()),
        };

        skillRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          skillService.updateSkill(nonExistentSkillId, updateData),
        ).rejects.toThrow(`Skill with id ${nonExistentSkillId} not found`);
      });
    });
  });

  describe('deleteSkill', () => {
    let userId: UserId;

    beforeEach(() => {
      userId = createUserId(uuidv4());
    });

    describe('when the skill exists', () => {
      let skillId: SkillId;
      let skill: Skill;

      beforeEach(async () => {
        skillId = createSkillId(uuidv4());
        skill = skillFactory({ id: skillId });

        skillRepository.findById = jest.fn().mockResolvedValue(skill);
        skillRepository.deleteById = jest.fn().mockResolvedValue(undefined);

        await skillService.deleteSkill(skillId, userId);
      });

      it('checks if the skill exists', () => {
        expect(skillRepository.findById).toHaveBeenCalledWith(skillId);
      });

      it('deletes the skill', () => {
        expect(skillRepository.deleteById).toHaveBeenCalledWith(
          skillId,
          userId,
        );
      });
    });

    describe('when the skill does not exist', () => {
      let nonExistentSkillId: SkillId;

      beforeEach(() => {
        nonExistentSkillId = createSkillId(uuidv4());
        skillRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          skillService.deleteSkill(nonExistentSkillId, userId),
        ).rejects.toThrow(`Skill with id ${nonExistentSkillId} not found`);
      });

      it('does not call deleteById', async () => {
        try {
          await skillService.deleteSkill(nonExistentSkillId, userId);
        } catch {
          // Ignore error
        }
        expect(skillRepository.deleteById).not.toHaveBeenCalled();
      });
    });
  });

  describe('listSkillsBySpace', () => {
    let spaceId: ReturnType<typeof createSpaceId>;
    let skills: Skill[];
    let result: Skill[];

    beforeEach(async () => {
      spaceId = createSpaceId(uuidv4());
      skills = [skillFactory({ spaceId }), skillFactory({ spaceId })];

      skillRepository.findBySpaceId = jest.fn().mockResolvedValue(skills);

      result = await skillService.listSkillsBySpace(spaceId);
    });

    it('calls repository with correct spaceId', () => {
      expect(skillRepository.findBySpaceId).toHaveBeenCalledWith(
        spaceId,
        undefined,
      );
    });

    it('returns skills for the specified space', () => {
      expect(result).toEqual(skills);
    });
  });

  describe('markSkillAsMoved', () => {
    const destinationSpaceId = createSpaceId(uuidv4());

    describe('when the skill exists', () => {
      let skillId: SkillId;
      let skill: Skill;

      beforeEach(async () => {
        skillId = createSkillId(uuidv4());
        skill = skillFactory({ id: skillId });

        skillRepository.findById = jest.fn().mockResolvedValue(skill);
        skillRepository.markAsMoved = jest.fn().mockResolvedValue(undefined);

        await skillService.markSkillAsMoved(skillId, destinationSpaceId);
      });

      it('checks if the skill exists', () => {
        expect(skillRepository.findById).toHaveBeenCalledWith(skillId);
      });

      it('calls markAsMoved on repository with correct args', () => {
        expect(skillRepository.markAsMoved).toHaveBeenCalledWith(
          skillId,
          destinationSpaceId,
        );
      });
    });

    describe('when the skill does not exist', () => {
      let nonExistentSkillId: SkillId;

      beforeEach(() => {
        nonExistentSkillId = createSkillId(uuidv4());
        skillRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          skillService.markSkillAsMoved(nonExistentSkillId, destinationSpaceId),
        ).rejects.toThrow(`Skill with id ${nonExistentSkillId} not found`);
      });
    });
  });

  describe('duplicateSkillToSpace', () => {
    const destinationSpaceId = createSpaceId(uuidv4());
    const newUserId = createUserId(uuidv4());

    describe('when the skill exists', () => {
      let skillId: SkillId;
      let original: Skill;
      let savedSkill: Skill;
      let version: ReturnType<typeof skillVersionFactory>;
      let file: ReturnType<typeof skillFileFactory>;

      beforeEach(() => {
        skillId = createSkillId(uuidv4());
        original = skillFactory({ id: skillId });

        version = skillVersionFactory({ skillId });
        file = skillFileFactory({
          skillVersionId: version.id,
          isBase64: false,
        });

        savedSkill = skillFactory({
          name: original.name,
          slug: original.slug,
          description: original.description,
          prompt: original.prompt,
          userId: newUserId,
          spaceId: destinationSpaceId,
          movedTo: null,
        });

        skillRepository.findById = jest.fn().mockResolvedValue(original);
        skillRepository.add = jest.fn().mockResolvedValue(savedSkill);
        skillVersionRepository.findBySkillId = jest
          .fn()
          .mockResolvedValue([version]);
        skillVersionRepository.addMany = jest.fn().mockResolvedValue([version]);
        skillFileRepository.findBySkillVersionId = jest
          .fn()
          .mockResolvedValue([file]);
        skillFileRepository.addMany = jest.fn().mockResolvedValue([file]);
      });

      it('creates a new skill in the destination space', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            name: original.name,
            slug: original.slug,
            description: original.description,
            prompt: original.prompt,
            spaceId: destinationSpaceId,
            userId: newUserId,
            movedTo: null,
          }),
        );
      });

      it('copies all versions linked to the new skill', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillVersionRepository.addMany).toHaveBeenCalledWith([
          expect.objectContaining({
            name: version.name,
            slug: version.slug,
            description: version.description,
            prompt: version.prompt,
            version: version.version,
          }),
        ]);
      });

      it('copies all files linked to the new versions', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillFileRepository.addMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              path: file.path,
              content: file.content,
              permissions: file.permissions,
              isBase64: file.isBase64,
            }),
          ]),
        );
      });

      it('returns the duplicated skill', async () => {
        const result = await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(result).toEqual(savedSkill);
      });

      it('uses the provided newUserId for the duplicated skill', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: newUserId,
          }),
        );
      });

      it('sets movedTo to null on the duplicated skill', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            movedTo: null,
          }),
        );
      });
    });

    describe('when the skill has multiple versions with files', () => {
      let skillId: SkillId;
      let original: Skill;
      let version1: ReturnType<typeof skillVersionFactory>;
      let version2: ReturnType<typeof skillVersionFactory>;
      let file1: ReturnType<typeof skillFileFactory>;
      let file2: ReturnType<typeof skillFileFactory>;

      beforeEach(() => {
        skillId = createSkillId(uuidv4());
        original = skillFactory({ id: skillId });

        version1 = skillVersionFactory({ skillId, version: 1 });
        version2 = skillVersionFactory({ skillId, version: 2 });

        file1 = skillFileFactory({
          skillVersionId: version1.id,
          isBase64: false,
        });
        file2 = skillFileFactory({
          skillVersionId: version2.id,
          isBase64: false,
        });

        skillRepository.findById = jest.fn().mockResolvedValue(original);
        skillRepository.add = jest.fn().mockResolvedValue(original);
        skillVersionRepository.findBySkillId = jest
          .fn()
          .mockResolvedValue([version1, version2]);
        skillVersionRepository.addMany = jest
          .fn()
          .mockResolvedValue([version1, version2]);
        skillFileRepository.findBySkillVersionId = jest
          .fn()
          .mockImplementation((versionId) => {
            if (versionId === version1.id) return Promise.resolve([file1]);
            if (versionId === version2.id) return Promise.resolve([file2]);
            return Promise.resolve([]);
          });
        skillFileRepository.addMany = jest.fn().mockResolvedValue([]);
      });

      it('copies all versions in a single bulk call', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillVersionRepository.addMany).toHaveBeenCalledTimes(1);
        expect(skillVersionRepository.addMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: version1.name }),
            expect.objectContaining({ name: version2.name }),
          ]),
        );
      });

      it('copies all files in a single bulk call', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillFileRepository.addMany).toHaveBeenCalledTimes(1);
        expect(skillFileRepository.addMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ path: file1.path }),
            expect.objectContaining({ path: file2.path }),
          ]),
        );
      });
    });

    describe('when a version has no files', () => {
      let skillId: SkillId;
      let original: Skill;
      let version: ReturnType<typeof skillVersionFactory>;

      beforeEach(() => {
        skillId = createSkillId(uuidv4());
        original = skillFactory({ id: skillId });
        version = skillVersionFactory({ skillId });

        skillRepository.findById = jest.fn().mockResolvedValue(original);
        skillRepository.add = jest.fn().mockResolvedValue(original);
        skillVersionRepository.findBySkillId = jest
          .fn()
          .mockResolvedValue([version]);
        skillVersionRepository.addMany = jest.fn().mockResolvedValue([version]);
        skillFileRepository.findBySkillVersionId = jest
          .fn()
          .mockResolvedValue([]);
      });

      it('does not call addMany for files', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillFileRepository.addMany).not.toHaveBeenCalled();
      });
    });

    describe('when the skill does not exist', () => {
      let nonExistentSkillId: SkillId;

      beforeEach(() => {
        nonExistentSkillId = createSkillId(uuidv4());
        skillRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          skillService.duplicateSkillToSpace(
            nonExistentSkillId,
            destinationSpaceId,
            newUserId,
          ),
        ).rejects.toThrow(`Skill with id ${nonExistentSkillId} not found`);
      });
    });

    describe('when the skill has no versions', () => {
      let skillId: SkillId;
      let original: Skill;
      let savedSkill: Skill;

      beforeEach(() => {
        skillId = createSkillId(uuidv4());
        original = skillFactory({ id: skillId });
        savedSkill = skillFactory({
          name: original.name,
          spaceId: destinationSpaceId,
          userId: newUserId,
          movedTo: null,
        });

        skillRepository.findById = jest.fn().mockResolvedValue(original);
        skillRepository.add = jest.fn().mockResolvedValue(savedSkill);
        skillVersionRepository.findBySkillId = jest.fn().mockResolvedValue([]);
      });

      it('creates the skill', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillRepository.add).toHaveBeenCalledTimes(1);
      });

      it('does not create any versions', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillVersionRepository.addMany).not.toHaveBeenCalled();
      });

      it('does not create any files', async () => {
        await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(skillFileRepository.addMany).not.toHaveBeenCalled();
      });

      it('returns the duplicated skill', async () => {
        const result = await skillService.duplicateSkillToSpace(
          skillId,
          destinationSpaceId,
          newUserId,
        );

        expect(result).toEqual(savedSkill);
      });
    });
  });
});
