import { PackmindLogger } from '@packmind/logger';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  Skill,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../test/skillFactory';
import { SkillSchema } from '../schemas/SkillSchema';
import { SkillVersionSchema } from '../schemas/SkillVersionSchema';
import { SkillRepository } from './SkillRepository';

describe('SkillRepository', () => {
  const fixture = createTestDatasourceFixture([
    SkillSchema,
    SkillVersionSchema,
    SpaceSchema,
  ]);

  let skillRepository: SkillRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Skill>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(SkillSchema);

    skillRepository = new SkillRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('findBySlug', () => {
    it('finds skill by slug and organization', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());

      const space = spaceFactory({
        id: spaceId,
        organizationId,
      });
      await fixture.datasource.getRepository(SpaceSchema).save(space);

      const skill = skillFactory({
        spaceId,
        slug: 'test-slug',
      });
      await skillRepository.add(skill);

      const foundSkill = await skillRepository.findBySlug(
        'test-slug',
        organizationId,
      );

      expect(foundSkill).toEqual(skill);
    });

    describe('when skill not found', () => {
      it('returns null', async () => {
        const organizationId = createOrganizationId(uuidv4());

        const foundSkill = await skillRepository.findBySlug(
          'non-existent',
          organizationId,
        );

        expect(foundSkill).toBeNull();
      });
    });

    describe('when slug exists but organization does not match', () => {
      it('returns null', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const differentOrgId = createOrganizationId(uuidv4());
        const spaceId = createSpaceId(uuidv4());

        const space = spaceFactory({
          id: spaceId,
          organizationId,
        });
        await fixture.datasource.getRepository(SpaceSchema).save(space);

        const skill = skillFactory({
          spaceId,
          slug: 'test-slug',
        });
        await skillRepository.add(skill);

        const foundSkill = await skillRepository.findBySlug(
          'test-slug',
          differentOrgId,
        );

        expect(foundSkill).toBeNull();
      });
    });
  });

  describe('findBySpaceId', () => {
    it('finds all skills in a space', async () => {
      const spaceId = createSpaceId(uuidv4());
      const skill1 = skillFactory({ spaceId, name: 'Skill 1' });
      const skill2 = skillFactory({ spaceId, name: 'Skill 2' });
      await skillRepository.add(skill1);
      await skillRepository.add(skill2);

      const foundSkills = await skillRepository.findBySpaceId(spaceId);

      expect(foundSkills).toHaveLength(2);
    });

    describe('when no skills found', () => {
      it('returns empty array', async () => {
        const spaceId = createSpaceId(uuidv4());

        const foundSkills = await skillRepository.findBySpaceId(spaceId);

        expect(foundSkills).toHaveLength(0);
      });
    });

    it('returns only skills from specified space', async () => {
      const spaceId1 = createSpaceId(uuidv4());
      const spaceId2 = createSpaceId(uuidv4());
      const skill1 = skillFactory({ spaceId: spaceId1 });
      const skill2 = skillFactory({ spaceId: spaceId2 });
      await skillRepository.add(skill1);
      await skillRepository.add(skill2);

      const foundSkills = await skillRepository.findBySpaceId(spaceId1);

      expect(foundSkills.map((s) => s.id)).toEqual([skill1.id]);
    });
  });

  describe('findByUserId', () => {
    it('finds all skills created by user', async () => {
      const userId = createUserId(uuidv4());
      const skill1 = skillFactory({ userId, name: 'Skill 1' });
      const skill2 = skillFactory({ userId, name: 'Skill 2' });
      await skillRepository.add(skill1);
      await skillRepository.add(skill2);

      const foundSkills = await skillRepository.findByUserId(userId);

      expect(foundSkills).toHaveLength(2);
    });

    describe('when no skills found', () => {
      it('returns empty array', async () => {
        const userId = createUserId(uuidv4());

        const foundSkills = await skillRepository.findByUserId(userId);

        expect(foundSkills).toHaveLength(0);
      });
    });

    it('returns only skills from specified user', async () => {
      const userId1 = createUserId(uuidv4());
      const userId2 = createUserId(uuidv4());
      const skill1 = skillFactory({ userId: userId1 });
      const skill2 = skillFactory({ userId: userId2 });
      await skillRepository.add(skill1);
      await skillRepository.add(skill2);

      const foundSkills = await skillRepository.findByUserId(userId1);

      expect(foundSkills.map((s) => s.id)).toEqual([skill1.id]);
    });
  });

  describe('findByOrganizationId', () => {
    it('returns empty array as method is deprecated', async () => {
      const organizationId = createOrganizationId(uuidv4());

      const foundSkills =
        await skillRepository.findByOrganizationId(organizationId);

      expect(foundSkills).toHaveLength(0);
    });
  });

  describe('findByOrganizationAndUser', () => {
    it('returns empty array as method is deprecated', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      const foundSkills = await skillRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );

      expect(foundSkills).toHaveLength(0);
    });
  });
});
