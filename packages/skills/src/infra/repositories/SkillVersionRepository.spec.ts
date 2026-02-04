import { PackmindLogger } from '@packmind/logger';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { SkillVersion } from '@packmind/types';
import { Repository } from 'typeorm';
import { skillFactory } from '../../../test/skillFactory';
import { skillVersionFactory } from '../../../test/skillVersionFactory';
import { SkillSchema } from '../schemas/SkillSchema';
import { SkillVersionSchema } from '../schemas/SkillVersionSchema';
import { SkillVersionRepository } from './SkillVersionRepository';
import { SkillRepository } from './SkillRepository';

describe('SkillVersionRepository', () => {
  const fixture = createTestDatasourceFixture([
    SkillSchema,
    SkillVersionSchema,
  ]);

  let skillVersionRepository: SkillVersionRepository;
  let skillRepository: SkillRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<SkillVersion>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(SkillVersionSchema);

    skillVersionRepository = new SkillVersionRepository(
      typeormRepo,
      stubbedLogger,
    );
    skillRepository = new SkillRepository(
      fixture.datasource.getRepository(SkillSchema),
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('list', () => {
    it('returns all skill versions', async () => {
      const skill1 = skillFactory();
      const skill2 = skillFactory();
      await skillRepository.add(skill1);
      await skillRepository.add(skill2);

      const version1 = skillVersionFactory({ skillId: skill1.id, version: 1 });
      const version2 = skillVersionFactory({ skillId: skill2.id, version: 2 });
      await skillVersionRepository.add(version1);
      await skillVersionRepository.add(version2);

      const versions = await skillVersionRepository.list();

      expect(versions).toHaveLength(2);
    });

    describe('when no versions exist', () => {
      it('returns empty array', async () => {
        const versions = await skillVersionRepository.list();

        expect(versions).toHaveLength(0);
      });
    });
  });

  describe('findBySkillId', () => {
    it('finds all versions for a skill ordered by version descending', async () => {
      const skill = skillFactory();
      await skillRepository.add(skill);

      const version1 = skillVersionFactory({ skillId: skill.id, version: 1 });
      const version2 = skillVersionFactory({ skillId: skill.id, version: 2 });
      const version3 = skillVersionFactory({ skillId: skill.id, version: 3 });
      await skillVersionRepository.add(version1);
      await skillVersionRepository.add(version2);
      await skillVersionRepository.add(version3);

      const versions = await skillVersionRepository.findBySkillId(skill.id);

      expect(versions.map((v) => v.version)).toEqual([3, 2, 1]);
    });

    describe('when no versions found', () => {
      it('returns empty array', async () => {
        const skill = skillFactory();
        await skillRepository.add(skill);

        const versions = await skillVersionRepository.findBySkillId(skill.id);

        expect(versions).toHaveLength(0);
      });
    });

    it('returns only versions for specified skill', async () => {
      const skill1 = skillFactory();
      const skill2 = skillFactory();
      await skillRepository.add(skill1);
      await skillRepository.add(skill2);

      const version1 = skillVersionFactory({ skillId: skill1.id });
      const version2 = skillVersionFactory({ skillId: skill2.id });
      await skillVersionRepository.add(version1);
      await skillVersionRepository.add(version2);

      const versions = await skillVersionRepository.findBySkillId(skill1.id);

      expect(versions.map((v) => v.id)).toEqual([version1.id]);
    });
  });

  describe('findLatestBySkillId', () => {
    it('returns the latest version', async () => {
      const skill = skillFactory();
      await skillRepository.add(skill);

      const version1 = skillVersionFactory({ skillId: skill.id, version: 1 });
      const version2 = skillVersionFactory({ skillId: skill.id, version: 2 });
      const version3 = skillVersionFactory({ skillId: skill.id, version: 3 });
      await skillVersionRepository.add(version1);
      await skillVersionRepository.add(version2);
      await skillVersionRepository.add(version3);

      const latestVersion = await skillVersionRepository.findLatestBySkillId(
        skill.id,
      );

      expect(latestVersion?.version).toBe(3);
    });

    describe('when no versions found', () => {
      it('returns null', async () => {
        const skill = skillFactory();
        await skillRepository.add(skill);

        const latestVersion = await skillVersionRepository.findLatestBySkillId(
          skill.id,
        );

        expect(latestVersion).toBeNull();
      });
    });

    describe('when one version exists', () => {
      it('returns the only version', async () => {
        const skill = skillFactory();
        await skillRepository.add(skill);

        const version1 = skillVersionFactory({
          skillId: skill.id,
          version: 1,
        });
        await skillVersionRepository.add(version1);

        const latestVersion = await skillVersionRepository.findLatestBySkillId(
          skill.id,
        );

        expect(latestVersion?.version).toBe(1);
      });
    });
  });

  describe('findBySkillIdAndVersion', () => {
    it('finds specific version of a skill', async () => {
      const skill = skillFactory();
      await skillRepository.add(skill);

      const version1 = skillVersionFactory({ skillId: skill.id, version: 1 });
      const version2 = skillVersionFactory({ skillId: skill.id, version: 2 });
      await skillVersionRepository.add(version1);
      await skillVersionRepository.add(version2);

      const foundVersion = await skillVersionRepository.findBySkillIdAndVersion(
        skill.id,
        2,
      );

      expect(foundVersion?.id).toBe(version2.id);
    });

    describe('when version not found', () => {
      it('returns null', async () => {
        const skill = skillFactory();
        await skillRepository.add(skill);

        const version1 = skillVersionFactory({
          skillId: skill.id,
          version: 1,
        });
        await skillVersionRepository.add(version1);

        const foundVersion =
          await skillVersionRepository.findBySkillIdAndVersion(skill.id, 99);

        expect(foundVersion).toBeNull();
      });
    });

    describe('when skill has no versions', () => {
      it('returns null', async () => {
        const skill = skillFactory();
        await skillRepository.add(skill);

        const foundVersion =
          await skillVersionRepository.findBySkillIdAndVersion(skill.id, 1);

        expect(foundVersion).toBeNull();
      });
    });
  });

  describe('updateMetadata', () => {
    it('updates metadata for a version', async () => {
      const skill = skillFactory();
      await skillRepository.add(skill);

      const version = skillVersionFactory({
        skillId: skill.id,
        metadata: { key1: 'value1' },
      });
      await skillVersionRepository.add(version);

      const newMetadata = { key1: 'updated', key2: 'new' };
      await skillVersionRepository.updateMetadata(version.id, newMetadata);

      const updatedVersion = await skillVersionRepository.findById(version.id);
      expect(updatedVersion?.metadata).toEqual(newMetadata);
    });

    it('replaces existing metadata completely', async () => {
      const skill = skillFactory();
      await skillRepository.add(skill);

      const version = skillVersionFactory({
        skillId: skill.id,
        metadata: { oldKey: 'oldValue', key1: 'value1' },
      });
      await skillVersionRepository.add(version);

      const newMetadata = { key1: 'updated' };
      await skillVersionRepository.updateMetadata(version.id, newMetadata);

      const updatedVersion = await skillVersionRepository.findById(version.id);
      expect(updatedVersion?.metadata).toEqual(newMetadata);
    });
  });
});
