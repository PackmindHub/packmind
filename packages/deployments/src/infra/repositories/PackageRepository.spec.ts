import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  createPackageId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  Package,
  PackageSlugInSpace,
  SpaceId,
  Standard,
  StandardId,
} from '@packmind/types';
import { StandardSchema, standardsSchemas } from '@packmind/standards';
import { GitCommitSchema } from '@packmind/git';

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
    GitCommitSchema,
    ...standardsSchemas,
    PackageSchema,
    PackageSkillsSchema,
    PackageStandardsSchema,
    PackageCommandsSchema,
  ]);

  let repository: PackageRepository;
  let packageRepo: Repository<Package>;
  let standardRepo: Repository<Standard>;

  const packageId = createPackageId(uuidv4());

  const spaceAId = createSpaceId(uuidv4());
  const spaceBId = createSpaceId(uuidv4());
  const userId = createUserId(uuidv4());

  const savePackage = async (slug: string, spaceId: SpaceId) => {
    const pkg = {
      id: createPackageId(uuidv4()),
      name: slug,
      slug,
      description: `Package ${slug}`,
      spaceId,
      createdBy: userId,
    };
    await packageRepo.save(pkg);
    return pkg;
  };

  const saveStandard = async (name: string, spaceId: SpaceId) => {
    const standard = {
      id: createStandardId(uuidv4()),
      name,
      slug: name,
      description: `Standard ${name}`,
      version: 1,
      userId,
      scope: null,
      spaceId,
      movedTo: null,
    };
    await standardRepo.save(standard);
    return standard;
  };

  const linkStandard = async (
    packageId: Package['id'],
    standardId: StandardId,
  ) => {
    await fixture.datasource
      .getRepository(PackageStandardsSchema)
      .save({ package_id: packageId, standard_id: standardId });
  };

  // Every statement goes through one query runner, so counting the runners
  // handed out from here counts the round trips a method makes.
  const countQueries = () => {
    const spy = jest.spyOn(fixture.datasource, 'createQueryRunner');
    spy.mockClear();
    return spy;
  };

  beforeAll(async () => {
    await fixture.initialize();
    fixture.snapshot();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  beforeEach(async () => {
    repository = new PackageRepository(
      fixture.datasource.getRepository(PackageSchema),
      stubLogger(),
    );
    packageRepo = fixture.datasource.getRepository(PackageSchema);
    standardRepo = fixture.datasource.getRepository(StandardSchema);

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

  describe('findBySlugsAndSpacesWithStandards', () => {
    describe('when entries span two spaces', () => {
      let entries: PackageSlugInSpace[];
      let result: Awaited<
        ReturnType<PackageRepository['findBySlugsAndSpacesWithStandards']>
      >;

      beforeEach(async () => {
        const packageInA = await savePackage('frontend-pack', spaceAId);
        const packageInB = await savePackage('backend-pack', spaceBId);
        const standardInA = await saveStandard('standard-a', spaceAId);
        const standardInB = await saveStandard('standard-b', spaceBId);
        await linkStandard(packageInA.id, standardInA.id);
        await linkStandard(packageInB.id, standardInB.id);

        entries = [
          { slug: 'frontend-pack', spaceId: spaceAId },
          { slug: 'backend-pack', spaceId: spaceBId },
        ];
        result = await repository.findBySlugsAndSpacesWithStandards(entries);
      });

      it('returns both packages', () => {
        expect(result.map((pkg) => pkg.slug).sort()).toEqual([
          'backend-pack',
          'frontend-pack',
        ]);
      });

      it('hydrates each package with its own standards', () => {
        const packageInA = result.find((pkg) => pkg.slug === 'frontend-pack');
        expect(packageInA?.standards.map((standard) => standard.name)).toEqual([
          'standard-a',
        ]);
      });

      it('issues one packages query for both spaces', async () => {
        const spy = countQueries();
        await repository.findBySlugsAndSpacesWithStandards(entries);
        // 1 packages + 1 package_standards junction + 1 standards entity
        // lookup. Nothing about commands or skills is read.
        expect(spy).toHaveBeenCalledTimes(3);
      });
    });

    describe('when the same pair is requested twice', () => {
      let entries: PackageSlugInSpace[];
      let result: Awaited<
        ReturnType<PackageRepository['findBySlugsAndSpacesWithStandards']>
      >;

      beforeEach(async () => {
        const pkg = await savePackage('frontend-pack', spaceAId);
        const standard = await saveStandard('standard-a', spaceAId);
        await linkStandard(pkg.id, standard.id);

        entries = [
          { slug: 'frontend-pack', spaceId: spaceAId },
          { slug: 'frontend-pack', spaceId: spaceAId },
        ];
        result = await repository.findBySlugsAndSpacesWithStandards(entries);
      });

      it('returns the package once', () => {
        expect(result.map((pkg) => pkg.slug)).toEqual(['frontend-pack']);
      });

      it('issues as many queries as requesting the pair once', async () => {
        const spy = countQueries();
        await repository.findBySlugsAndSpacesWithStandards(entries);
        // Same 3 round trips as the single-entry case: the duplicate pair is
        // dropped before the `where` is built, so it adds no branch and no
        // query.
        expect(spy).toHaveBeenCalledTimes(3);
      });
    });

    describe('when the same slug exists in another space', () => {
      let result: Awaited<
        ReturnType<PackageRepository['findBySlugsAndSpacesWithStandards']>
      >;

      beforeEach(async () => {
        await savePackage('shared-slug', spaceAId);
        await savePackage('shared-slug', spaceBId);

        result = await repository.findBySlugsAndSpacesWithStandards([
          { slug: 'shared-slug', spaceId: spaceAId },
        ]);
      });

      it('returns only the package of the requested space', () => {
        expect(result.map((pkg) => pkg.spaceId)).toEqual([spaceAId]);
      });
    });

    describe('when a requested pair does not exist', () => {
      let result: Awaited<
        ReturnType<PackageRepository['findBySlugsAndSpacesWithStandards']>
      >;

      beforeEach(async () => {
        await savePackage('frontend-pack', spaceAId);
        await savePackage('backend-pack', spaceBId);

        // Both slugs and both spaces are requested, but crossed over, so
        // neither pair matches an existing package.
        result = await repository.findBySlugsAndSpacesWithStandards([
          { slug: 'frontend-pack', spaceId: spaceBId },
          { slug: 'backend-pack', spaceId: spaceAId },
        ]);
      });

      it('returns no package', () => {
        expect(result).toEqual([]);
      });
    });

    describe('when a package was soft deleted', () => {
      let result: Awaited<
        ReturnType<PackageRepository['findBySlugsAndSpacesWithStandards']>
      >;

      beforeEach(async () => {
        const pkg = await savePackage('frontend-pack', spaceAId);
        await packageRepo.softDelete(pkg.id);

        result = await repository.findBySlugsAndSpacesWithStandards([
          { slug: 'frontend-pack', spaceId: spaceAId },
        ]);
      });

      it('excludes it', () => {
        expect(result).toEqual([]);
      });
    });

    describe('when no entry is given', () => {
      it('returns no package without querying', async () => {
        const spy = countQueries();
        await repository.findBySlugsAndSpacesWithStandards([]);
        expect(spy).not.toHaveBeenCalled();
      });
    });
  });
});
