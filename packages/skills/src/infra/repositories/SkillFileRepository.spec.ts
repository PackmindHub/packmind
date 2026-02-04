import { PackmindLogger } from '@packmind/logger';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createSkillId,
  createSkillVersionId,
  createUserId,
  SkillFile,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  skillFactory,
  skillVersionFactory,
  skillFileFactory,
} from '../../../test';
import { SkillFileSchema } from '../schemas/SkillFileSchema';
import { SkillSchema } from '../schemas/SkillSchema';
import { SkillVersionSchema } from '../schemas/SkillVersionSchema';
import { SkillFileRepository } from './SkillFileRepository';

describe('SkillFileRepository', () => {
  const fixture = createTestDatasourceFixture([
    SkillFileSchema,
    SkillVersionSchema,
    SkillSchema,
    SpaceSchema,
  ]);

  let skillFileRepository: SkillFileRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<SkillFile>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(SkillFileSchema);

    skillFileRepository = new SkillFileRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('findBySkillVersionId', () => {
    it('finds all files for a skill version', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const skillId = createSkillId(uuidv4());
      const skillVersionId = createSkillVersionId(uuidv4());
      const userId = createUserId(uuidv4());

      const space = spaceFactory({
        id: spaceId,
        organizationId,
      });
      await fixture.datasource.getRepository(SpaceSchema).save(space);

      const skill = skillFactory({
        id: skillId,
        spaceId,
        userId,
      });
      await fixture.datasource.getRepository(SkillSchema).save(skill);

      const skillVersion = skillVersionFactory({
        id: skillVersionId,
        skillId,
        userId,
      });
      await fixture.datasource
        .getRepository(SkillVersionSchema)
        .save(skillVersion);

      const file1 = skillFileFactory({
        skillVersionId,
        path: 'SKILL.md',
      });
      const file2 = skillFileFactory({
        skillVersionId,
        path: 'prompts/helper.md',
      });
      await skillFileRepository.addMany([file1, file2]);

      const foundFiles =
        await skillFileRepository.findBySkillVersionId(skillVersionId);

      expect(foundFiles).toHaveLength(2);
    });

    it('finds files with correct content', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const skillId = createSkillId(uuidv4());
      const skillVersionId = createSkillVersionId(uuidv4());
      const userId = createUserId(uuidv4());

      const space = spaceFactory({
        id: spaceId,
        organizationId,
      });
      await fixture.datasource.getRepository(SpaceSchema).save(space);

      const skill = skillFactory({
        id: skillId,
        spaceId,
        userId,
      });
      await fixture.datasource.getRepository(SkillSchema).save(skill);

      const skillVersion = skillVersionFactory({
        id: skillVersionId,
        skillId,
        userId,
      });
      await fixture.datasource
        .getRepository(SkillVersionSchema)
        .save(skillVersion);

      const file = skillFileFactory({
        skillVersionId,
        path: 'SKILL.md',
        content: 'Test content',
      });
      await skillFileRepository.addMany([file]);

      const foundFiles =
        await skillFileRepository.findBySkillVersionId(skillVersionId);

      expect(foundFiles[0].content).toBe('Test content');
    });

    describe('when no files exist for version', () => {
      it('returns empty array', async () => {
        const skillVersionId = createSkillVersionId(uuidv4());

        const foundFiles =
          await skillFileRepository.findBySkillVersionId(skillVersionId);

        expect(foundFiles).toEqual([]);
      });
    });

    describe('when multiple versions exist', () => {
      it('returns only files for specified version', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const spaceId = createSpaceId(uuidv4());
        const skillId = createSkillId(uuidv4());
        const skillVersionId1 = createSkillVersionId(uuidv4());
        const skillVersionId2 = createSkillVersionId(uuidv4());
        const userId = createUserId(uuidv4());

        const space = spaceFactory({
          id: spaceId,
          organizationId,
        });
        await fixture.datasource.getRepository(SpaceSchema).save(space);

        const skill = skillFactory({
          id: skillId,
          spaceId,
          userId,
        });
        await fixture.datasource.getRepository(SkillSchema).save(skill);

        const skillVersion1 = skillVersionFactory({
          id: skillVersionId1,
          skillId,
          userId,
          version: 1,
        });
        const skillVersion2 = skillVersionFactory({
          id: skillVersionId2,
          skillId,
          userId,
          version: 2,
        });
        await fixture.datasource
          .getRepository(SkillVersionSchema)
          .save([skillVersion1, skillVersion2]);

        const file1 = skillFileFactory({
          skillVersionId: skillVersionId1,
          path: 'version1.md',
        });
        const file2 = skillFileFactory({
          skillVersionId: skillVersionId2,
          path: 'version2.md',
        });
        await skillFileRepository.addMany([file1, file2]);

        const foundFiles =
          await skillFileRepository.findBySkillVersionId(skillVersionId1);

        expect(foundFiles).toHaveLength(1);
      });
    });
  });

  describe('addMany', () => {
    it('adds multiple files successfully', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const skillId = createSkillId(uuidv4());
      const skillVersionId = createSkillVersionId(uuidv4());
      const userId = createUserId(uuidv4());

      const space = spaceFactory({
        id: spaceId,
        organizationId,
      });
      await fixture.datasource.getRepository(SpaceSchema).save(space);

      const skill = skillFactory({
        id: skillId,
        spaceId,
        userId,
      });
      await fixture.datasource.getRepository(SkillSchema).save(skill);

      const skillVersion = skillVersionFactory({
        id: skillVersionId,
        skillId,
        userId,
      });
      await fixture.datasource
        .getRepository(SkillVersionSchema)
        .save(skillVersion);

      const files = [
        skillFileFactory({
          skillVersionId,
          path: 'SKILL.md',
        }),
        skillFileFactory({
          skillVersionId,
          path: 'prompts/helper.md',
        }),
        skillFileFactory({
          skillVersionId,
          path: 'data/config.json',
        }),
      ];

      const savedFiles = await skillFileRepository.addMany(files);

      expect(savedFiles).toHaveLength(3);
    });

    it('returns saved files with generated IDs', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const skillId = createSkillId(uuidv4());
      const skillVersionId = createSkillVersionId(uuidv4());
      const userId = createUserId(uuidv4());

      const space = spaceFactory({
        id: spaceId,
        organizationId,
      });
      await fixture.datasource.getRepository(SpaceSchema).save(space);

      const skill = skillFactory({
        id: skillId,
        spaceId,
        userId,
      });
      await fixture.datasource.getRepository(SkillSchema).save(skill);

      const skillVersion = skillVersionFactory({
        id: skillVersionId,
        skillId,
        userId,
      });
      await fixture.datasource
        .getRepository(SkillVersionSchema)
        .save(skillVersion);

      const files = [
        skillFileFactory({
          skillVersionId,
          path: 'SKILL.md',
        }),
      ];

      const savedFiles = await skillFileRepository.addMany(files);

      expect(savedFiles[0].id).toBeDefined();
    });

    describe('when adding files with nested paths', () => {
      it('preserves file paths correctly', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const spaceId = createSpaceId(uuidv4());
        const skillId = createSkillId(uuidv4());
        const skillVersionId = createSkillVersionId(uuidv4());
        const userId = createUserId(uuidv4());

        const space = spaceFactory({
          id: spaceId,
          organizationId,
        });
        await fixture.datasource.getRepository(SpaceSchema).save(space);

        const skill = skillFactory({
          id: skillId,
          spaceId,
          userId,
        });
        await fixture.datasource.getRepository(SkillSchema).save(skill);

        const skillVersion = skillVersionFactory({
          id: skillVersionId,
          skillId,
          userId,
        });
        await fixture.datasource
          .getRepository(SkillVersionSchema)
          .save(skillVersion);

        const files = [
          skillFileFactory({
            skillVersionId,
            path: 'deep/nested/directory/file.md',
          }),
        ];

        const savedFiles = await skillFileRepository.addMany(files);

        expect(savedFiles[0].path).toBe('deep/nested/directory/file.md');
      });
    });

    describe('when adding empty array', () => {
      it('returns empty array', async () => {
        const savedFiles = await skillFileRepository.addMany([]);

        expect(savedFiles).toEqual([]);
      });
    });

    describe('when adding files with permissions', () => {
      it('saves permissions correctly', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const spaceId = createSpaceId(uuidv4());
        const skillId = createSkillId(uuidv4());
        const skillVersionId = createSkillVersionId(uuidv4());
        const userId = createUserId(uuidv4());

        const space = spaceFactory({
          id: spaceId,
          organizationId,
        });
        await fixture.datasource.getRepository(SpaceSchema).save(space);

        const skill = skillFactory({
          id: skillId,
          spaceId,
          userId,
        });
        await fixture.datasource.getRepository(SkillSchema).save(skill);

        const skillVersion = skillVersionFactory({
          id: skillVersionId,
          skillId,
          userId,
        });
        await fixture.datasource
          .getRepository(SkillVersionSchema)
          .save(skillVersion);

        const files = [
          skillFileFactory({
            skillVersionId,
            path: 'SKILL.md',
            permissions: 'rw-r--r--',
          }),
        ];

        const savedFiles = await skillFileRepository.addMany(files);

        expect(savedFiles[0].permissions).toBe('rw-r--r--');
      });
    });
  });
});
