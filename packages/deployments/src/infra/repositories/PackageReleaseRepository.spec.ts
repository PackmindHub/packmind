import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  Command,
  CommandVersion,
  createPackageReleaseId,
  createSkillVersionId,
  Package,
  PackageRelease,
  Skill,
  SkillVersion,
  Standard,
  StandardVersion,
} from '@packmind/types';
import { GitCommitSchema } from '@packmind/git';
import {
  CommandSchema,
  CommandVersionSchema,
  commandsSchemas,
} from '@packmind/commands';
import {
  SkillSchema,
  SkillVersionSchema,
  skillsSchemas,
} from '@packmind/skills';
import {
  StandardSchema,
  StandardVersionSchema,
  standardsSchemas,
} from '@packmind/standards';
import { commandFactory, commandVersionFactory } from '@packmind/commands/test';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import {
  standardFactory,
  standardVersionFactory,
} from '@packmind/standards/test';
import { packageFactory } from '../../../test';
import { PackageSchema } from '../schemas/PackageSchema';
import { PackageReleaseSchema } from '../schemas/PackageReleaseSchema';
import { PackageReleaseRepository } from './PackageReleaseRepository';
import { PackageReleaseNotPersistedError } from '../../domain/errors/PackageReleaseNotPersistedError';

describe('PackageReleaseRepository', () => {
  const fixture = createTestDatasourceFixture([
    GitCommitSchema,
    ...standardsSchemas,
    ...commandsSchemas,
    ...skillsSchemas,
    PackageSchema,
    PackageReleaseSchema,
  ]);

  let repository: PackageReleaseRepository;

  // One package holding one of each family: a release that pinned only skills
  // would say nothing about the two other join tables.
  const pkg: Package = packageFactory({
    name: 'Frontend pack',
    description: 'Everything the frontend team ships with',
  });
  let commandVersion: CommandVersion;
  let standardVersion: StandardVersion;
  let skillVersion: SkillVersion;
  let command: Command;
  let standard: Standard;
  let skill: Skill;

  const releaseOf = (version: string) => ({
    id: createPackageReleaseId(uuidv4()),
    packageId: pkg.id,
    version,
    name: pkg.name,
    description: pkg.description,
  });

  const pinnedVersions = () => ({
    recipeVersionIds: [commandVersion.id],
    standardVersionIds: [standardVersion.id],
    skillVersionIds: [skillVersion.id],
  });

  beforeAll(async () => {
    await fixture.initialize();

    command = commandFactory({ spaceId: pkg.spaceId });
    standard = standardFactory({ spaceId: pkg.spaceId });
    skill = skillFactory({ spaceId: pkg.spaceId });

    await fixture.datasource.getRepository(PackageSchema).save(pkg);
    await fixture.datasource.getRepository(CommandSchema).save(command);
    await fixture.datasource.getRepository(StandardSchema).save(standard);
    await fixture.datasource.getRepository(SkillSchema).save(skill);

    commandVersion = await fixture.datasource
      .getRepository(CommandVersionSchema)
      .save(commandVersionFactory({ recipeId: command.id, version: 3 }));
    standardVersion = await fixture.datasource
      .getRepository(StandardVersionSchema)
      .save(standardVersionFactory({ standardId: standard.id, version: 2 }));
    skillVersion = await fixture.datasource
      .getRepository(SkillVersionSchema)
      .save(skillVersionFactory({ skillId: skill.id, version: 5 }));

    fixture.snapshot();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  beforeEach(() => {
    repository = new PackageReleaseRepository(
      fixture.datasource.getRepository(PackageReleaseSchema),
      stubLogger(),
    );
  });

  describe('when a release has been cut', () => {
    let release: PackageRelease;

    beforeEach(async () => {
      release = await repository.createWithVersions(
        releaseOf('1.2.0'),
        pinnedVersions(),
      );
    });

    it('reads the release back by package id', async () => {
      const releases = await repository.findByPackageId(pkg.id);

      expect(releases.map((found) => found.version)).toEqual(['1.2.0']);
    });

    it('hydrates the pinned command version', async () => {
      const [found] = await repository.findByPackageId(pkg.id);

      expect(found.recipeVersions.map((version) => version.id)).toEqual([
        commandVersion.id,
      ]);
    });

    it('hydrates the pinned standard version', async () => {
      const [found] = await repository.findByPackageId(pkg.id);

      expect(found.standardVersions.map((version) => version.id)).toEqual([
        standardVersion.id,
      ]);
    });

    it('hydrates the pinned skill version', async () => {
      const [found] = await repository.findByPackageId(pkg.id);

      expect(found.skillVersions.map((version) => version.id)).toEqual([
        skillVersion.id,
      ]);
    });

    it('returns the persisted release from the write', () => {
      expect(release.id).toBeDefined();
    });

    it('reads the release back by package id and version', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '1.2.0');

      expect(found?.id).toEqual(release.id);
    });

    it('hydrates all three families on the version read too', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '1.2.0');

      expect([
        found?.recipeVersions.length,
        found?.standardVersions.length,
        found?.skillVersions.length,
      ]).toEqual([1, 1, 1]);
    });

    it('stores the package name as it was at the cut', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '1.2.0');

      expect(found?.name).toEqual('Frontend pack');
    });

    it('stores the package description as it was at the cut', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '1.2.0');

      expect(found?.description).toEqual(
        'Everything the frontend team ships with',
      );
    });

    describe('when no release carries the requested version', () => {
      it('returns null', async () => {
        const found = await repository.findByPackageIdAndVersion(
          pkg.id,
          '9.9.9',
        );

        expect(found).toBeNull();
      });
    });

    describe('when the same version is released again', () => {
      it('refuses the second release', async () => {
        await expect(
          repository.createWithVersions(
            { ...releaseOf('1.2.0') },
            pinnedVersions(),
          ),
        ).rejects.toThrow();
      });
    });
  });

  describe('when a package has no release', () => {
    it('returns no release', async () => {
      const releases = await repository.findByPackageId(pkg.id);

      expect(releases).toEqual([]);
    });
  });

  // The transaction of `createWithVersions` is deliberately not asserted here.
  // pg-mem enforces the join tables' foreign keys, so the write below does
  // reject — but its `ROLLBACK` is a no-op (an insert survives a rolled-back
  // transaction), so a "leaves no release row behind" assertion would pass or
  // fail for reasons unrelated to the transaction and could never be honest.
  // What is asserted is the rejection itself.
  describe('when a pinned version does not exist', () => {
    it('refuses the release', async () => {
      await expect(
        repository.createWithVersions(releaseOf('2.0.0'), {
          ...pinnedVersions(),
          skillVersionIds: [createSkillVersionId(uuidv4())],
        }),
      ).rejects.toThrow();
    });
  });

  // A committed release that cannot be read back is a broken invariant, not an
  // answer: it must be distinguishable from `PackageReleaseNotFoundError`,
  // which is what asking for a version nobody cut returns. There is no way to
  // provoke it from the outside, so the read is stubbed.
  describe('when a committed release cannot be read back', () => {
    it('refuses with a named error rather than a generic one', async () => {
      jest
        .spyOn(repository, 'findByPackageIdAndVersion')
        .mockResolvedValue(null);

      await expect(
        repository.createWithVersions(releaseOf('3.0.0'), pinnedVersions()),
      ).rejects.toBeInstanceOf(PackageReleaseNotPersistedError);
    });
  });

  describe('when a pinned component version has been deleted', () => {
    beforeEach(async () => {
      await repository.createWithVersions(releaseOf('2.0.0'), pinnedVersions());
    });

    describe('reading it by package id and version', () => {
      it('hydrates the deleted command version at the number it pinned', async () => {
        await fixture.datasource
          .getRepository(CommandVersionSchema)
          .softDelete({ id: commandVersion.id });

        const found = await repository.findByPackageIdAndVersion(
          pkg.id,
          '2.0.0',
        );

        expect(
          found?.recipeVersions.map((version) => [version.id, version.version]),
        ).toEqual([[commandVersion.id, 3]]);
      });

      it('hydrates the deleted standard version at the number it pinned', async () => {
        await fixture.datasource
          .getRepository(StandardVersionSchema)
          .softDelete({ id: standardVersion.id });

        const found = await repository.findByPackageIdAndVersion(
          pkg.id,
          '2.0.0',
        );

        expect(
          found?.standardVersions.map((version) => [
            version.id,
            version.version,
          ]),
        ).toEqual([[standardVersion.id, 2]]);
      });
    });

    describe('reading it by package id', () => {
      it('hydrates both deleted versions', async () => {
        await fixture.datasource
          .getRepository(CommandVersionSchema)
          .softDelete({ id: commandVersion.id });
        await fixture.datasource
          .getRepository(StandardVersionSchema)
          .softDelete({ id: standardVersion.id });

        const [found] = await repository.findByPackageId(pkg.id);

        expect([
          found.recipeVersions.map((version) => version.id),
          found.standardVersions.map((version) => version.id),
        ]).toEqual([[commandVersion.id], [standardVersion.id]]);
      });
    });
  });

  describe('when a newer version of a pinned component is published', () => {
    beforeEach(async () => {
      await repository.createWithVersions(releaseOf('4.0.0'), pinnedVersions());

      await fixture.datasource
        .getRepository(CommandVersionSchema)
        .save(commandVersionFactory({ recipeId: command.id, version: 4 }));
      await fixture.datasource
        .getRepository(StandardVersionSchema)
        .save(standardVersionFactory({ standardId: standard.id, version: 3 }));
      await fixture.datasource
        .getRepository(SkillVersionSchema)
        .save(skillVersionFactory({ skillId: skill.id, version: 6 }));
    });

    describe('reading it by package id and version', () => {
      it('keeps the pinned command version', async () => {
        const found = await repository.findByPackageIdAndVersion(
          pkg.id,
          '4.0.0',
        );

        expect(
          found?.recipeVersions.map((version) => [version.id, version.version]),
        ).toEqual([[commandVersion.id, 3]]);
      });

      it('keeps the pinned standard version', async () => {
        const found = await repository.findByPackageIdAndVersion(
          pkg.id,
          '4.0.0',
        );

        expect(
          found?.standardVersions.map((version) => [
            version.id,
            version.version,
          ]),
        ).toEqual([[standardVersion.id, 2]]);
      });

      it('keeps the pinned skill version', async () => {
        const found = await repository.findByPackageIdAndVersion(
          pkg.id,
          '4.0.0',
        );

        expect(
          found?.skillVersions.map((version) => [version.id, version.version]),
        ).toEqual([[skillVersion.id, 5]]);
      });
    });

    describe('reading it by package id', () => {
      it('keeps all three pinned versions', async () => {
        const [found] = await repository.findByPackageId(pkg.id);

        expect([
          found.recipeVersions.map((version) => [version.id, version.version]),
          found.standardVersions.map((version) => [
            version.id,
            version.version,
          ]),
          found.skillVersions.map((version) => [version.id, version.version]),
        ]).toEqual([
          [[commandVersion.id, 3]],
          [[standardVersion.id, 2]],
          [[skillVersion.id, 5]],
        ]);
      });
    });
  });
});
