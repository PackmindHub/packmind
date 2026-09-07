import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { createPackageId, createSkillId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

import { PackageRepository } from './PackageRepository';
import { PackageSchema } from '../schemas/PackageSchema';
import { PackageSkillsSchema } from '../schemas/PackageSkillsSchema';
import { PackageStandardsSchema } from '../schemas/PackageStandardsSchema';
import { PackageCommandsSchema } from '../schemas/PackageCommandsSchema';
import { packageFactory } from '../../../test';

/**
 * What a package's `updated_at` is worth.
 *
 * Membership is written straight into three join tables, which the row's
 * update-date column does not see on its own: before this, a package could gain
 * five components and still report the moment it was named. Seeded old on
 * purpose, so the assertions do not depend on the clock's resolution.
 */
const SEEDED_AT = new Date('2026-01-01T00:00:00.000Z');

describe('PackageRepository', () => {
  const fixture = createTestDatasourceFixture([
    PackageSchema,
    PackageSkillsSchema,
    PackageStandardsSchema,
    PackageCommandsSchema,
  ]);

  let repository: PackageRepository;
  const packageId = createPackageId(uuidv4());

  beforeAll(async () => {
    await fixture.initialize();
    fixture.snapshot();
  });

  afterEach(() => fixture.cleanup());
  afterAll(() => fixture.destroy());

  beforeEach(async () => {
    repository = new PackageRepository(
      fixture.datasource.getRepository(PackageSchema),
      stubLogger(),
    );

    await fixture.datasource
      .getRepository(PackageSchema)
      .createQueryBuilder()
      .insert()
      .values({
        ...packageFactory({ id: packageId }),
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
      })
      .execute();
  });

  const timestamps = async () => {
    const row = await fixture.datasource
      .getRepository(PackageSchema)
      .createQueryBuilder('p')
      .where('p.id = :packageId', { packageId })
      .getOneOrFail();
    return {
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
    };
  };

  describe('when components are added', () => {
    it('records that the package changed', async () => {
      await repository.addSkills(packageId, [createSkillId(uuidv4())]);

      const { updatedAt } = await timestamps();
      expect(updatedAt).toBeGreaterThan(SEEDED_AT.getTime());
    });

    it('leaves the creation date alone', async () => {
      await repository.addSkills(packageId, [createSkillId(uuidv4())]);

      const { createdAt } = await timestamps();
      expect(createdAt).toEqual(SEEDED_AT.getTime());
    });

    describe('when the list of components to add is empty', () => {
      it('says nothing about the package', async () => {
        await repository.addSkills(packageId, []);

        const { updatedAt } = await timestamps();
        expect(updatedAt).toEqual(SEEDED_AT.getTime());
      });
    });
  });

  describe('when components are removed', () => {
    it('records that the package changed', async () => {
      const skillId = createSkillId(uuidv4());
      await repository.addSkills(packageId, [skillId]);
      await fixture.datasource
        .getRepository(PackageSchema)
        .update(packageId, { updatedAt: SEEDED_AT });

      await repository.removeSkills(packageId, [skillId]);

      const { updatedAt } = await timestamps();
      expect(updatedAt).toBeGreaterThan(SEEDED_AT.getTime());
    });
  });

  describe('when the whole list is replaced', () => {
    it('records that the package changed, emptied as well as filled', async () => {
      await repository.setStandards(packageId, []);

      const { updatedAt } = await timestamps();
      expect(updatedAt).toBeGreaterThan(SEEDED_AT.getTime());
    });
  });
});
