import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  Command,
  CommandVersion,
  createPackageReleaseId,
  createSkillVersionId,
  Package,
  PackageReleaseEntry,
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
  const fixture = createTestDatasourceFixture(
    [
      GitCommitSchema,
      ...standardsSchemas,
      ...commandsSchemas,
      ...skillsSchemas,
      PackageSchema,
      PackageReleaseSchema,
    ],
    { recordQueries: true },
  );

  const VERSION_TABLES = [
    '"command_versions"',
    '"standard_versions"',
    '"skill_versions"',
  ];

  const statementsReadingTwoFamilies = () =>
    fixture.queries.queries.filter(
      (query) =>
        VERSION_TABLES.filter((table) => query.includes(table)).length > 1,
    );

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
    let release: PackageReleaseEntry;

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
      const found = await repository.findByPackageIdAndVersion(pkg.id, '1.2.0');

      expect(found?.recipeVersions.map((version) => version.id)).toEqual([
        commandVersion.id,
      ]);
    });

    it('hydrates the pinned standard version', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '1.2.0');

      expect(found?.standardVersions.map((version) => version.id)).toEqual([
        standardVersion.id,
      ]);
    });

    it('hydrates the pinned skill version', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '1.2.0');

      expect(found?.skillVersions.map((version) => version.id)).toEqual([
        skillVersion.id,
      ]);
    });

    it('carries no pin on the listing', async () => {
      const [found] = await repository.findByPackageId(pkg.id);

      expect(found).not.toHaveProperty('recipeVersions');
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

  describe('reading the latest release of several packages at once', () => {
    const otherPackage: Package = packageFactory({
      spaceId: pkg.spaceId,
      name: 'Backend pack',
      description: 'What the backend team ships with',
    });

    beforeEach(async () => {
      await fixture.datasource.getRepository(PackageSchema).save(otherPackage);

      /*
       * `0.9.0` after `0.10.0` on purpose: the newest has to be picked by the
       * parsed triple, and as strings `0.10.0` sorts below `0.9.0`.
       */
      await repository.createWithVersions(
        releaseOf('0.10.0'),
        pinnedVersions(),
      );
      await repository.createWithVersions(releaseOf('0.9.0'), pinnedVersions());
      await repository.createWithVersions(
        { ...releaseOf('2.0.0'), packageId: otherPackage.id },
        pinnedVersions(),
      );
    });

    it('picks the highest version by triple rather than by string', async () => {
      const latest = await repository.findLatestByPackageIds([pkg.id]);

      expect(latest.get(pkg.id)?.version).toBe('0.10.0');
    });

    it('keys each package to its own newest release', async () => {
      const latest = await repository.findLatestByPackageIds([
        pkg.id,
        otherPackage.id,
      ]);

      expect(latest.get(otherPackage.id)?.version).toBe('2.0.0');
    });

    it('hydrates the pins of the release it picked', async () => {
      const latest = await repository.findLatestByPackageIds([pkg.id]);

      expect(latest.get(pkg.id)?.standardVersions.map((v) => v.id)).toEqual([
        standardVersion.id,
      ]);
    });

    it('omits a package that has never been released', async () => {
      const neverReleased = packageFactory({ spaceId: pkg.spaceId });
      await fixture.datasource.getRepository(PackageSchema).save(neverReleased);

      const latest = await repository.findLatestByPackageIds([
        neverReleased.id,
      ]);

      expect(latest.has(neverReleased.id)).toBe(false);
    });

    it('reads no package at all without querying', async () => {
      const latest = await repository.findLatestByPackageIds([]);

      expect(latest.size).toBe(0);
    });

    /*
     * Stored as a null triple rather than as 0.0.0, so it stays out of the
     * ordering altogether — exactly where the in-memory pick used to drop it.
     * A version nothing can parse cannot be the release a destination is moved
     * to, and naming it would send the reader after a version that is not one.
     */
    it('never picks a version the pattern refuses', async () => {
      const malformed = packageFactory({ spaceId: pkg.spaceId });
      await fixture.datasource.getRepository(PackageSchema).save(malformed);
      await repository.createWithVersions(
        { ...releaseOf('not-a-version'), packageId: malformed.id },
        pinnedVersions(),
      );

      const latest = await repository.findLatestByPackageIds([malformed.id]);

      expect(latest.has(malformed.id)).toBe(false);
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
        .spyOn(
          repository as unknown as {
            findEntry: () => Promise<PackageReleaseEntry | null>;
          },
          'findEntry',
        )
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
  });

  describe('when reading the content of a release', () => {
    beforeEach(async () => {
      await repository.createWithVersions(releaseOf('5.0.0'), pinnedVersions());
    });

    it('returns the full pinned command version', async () => {
      const found = await repository.findContentByPackageIdAndVersion(
        pkg.id,
        '5.0.0',
      );

      expect(found?.recipeVersions.map((version) => version.content)).toEqual([
        commandVersion.content,
      ]);
    });

    it('returns the full pinned skill version', async () => {
      const found = await repository.findContentByPackageIdAndVersion(
        pkg.id,
        '5.0.0',
      );

      expect(found?.skillVersions.map((version) => version.prompt)).toEqual([
        skillVersion.prompt,
      ]);
    });

    it('returns the full pinned standard version', async () => {
      const found = await repository.findContentByPackageIdAndVersion(
        pkg.id,
        '5.0.0',
      );

      expect(found?.standardVersions.map((version) => version.id)).toEqual([
        standardVersion.id,
      ]);
    });

    describe('when a pinned command version has been deleted since', () => {
      it('still returns it', async () => {
        await fixture.datasource
          .getRepository(CommandVersionSchema)
          .softDelete({ id: commandVersion.id });

        const found = await repository.findContentByPackageIdAndVersion(
          pkg.id,
          '5.0.0',
        );

        expect(found?.recipeVersions.map((version) => version.id)).toEqual([
          commandVersion.id,
        ]);
      });
    });

    describe('when no release carries the requested version', () => {
      it('returns null', async () => {
        const found = await repository.findContentByPackageIdAndVersion(
          pkg.id,
          '9.9.9',
        );

        expect(found).toBeNull();
      });
    });

    describe('SQL shape', () => {
      beforeEach(async () => {
        fixture.queries.reset();
        await repository.findContentByPackageIdAndVersion(pkg.id, '5.0.0');
      });

      it('never reads two artefact families in one statement', () => {
        expect(statementsReadingTwoFamilies()).toEqual([]);
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
  });
  describe('SQL shape', () => {
    beforeEach(async () => {
      await repository.createWithVersions(releaseOf('5.0.0'), pinnedVersions());
    });

    describe('when listing a package history', () => {
      beforeEach(async () => {
        fixture.queries.reset();

        await repository.findByPackageId(pkg.id);
      });

      it('issues one statement', () => {
        expect(fixture.queries.queries).toHaveLength(1);
      });

      it('reads no artefact family', () => {
        expect(
          fixture.queries.countMatching(/"(command|standard|skill)_versions"/),
        ).toBe(0);
      });
    });

    describe('when reading a release by version', () => {
      beforeEach(async () => {
        fixture.queries.reset();

        await repository.findByPackageIdAndVersion(pkg.id, '5.0.0');
      });

      it('never reads two artefact families in one statement', () => {
        expect(statementsReadingTwoFamilies()).toEqual([]);
      });

      it('reads no command body, standard description or skill prompt', () => {
        expect([
          fixture.queries.countMatching('"recipeVersion"."content"'),
          fixture.queries.countMatching('"standardVersion"."description"'),
          fixture.queries.countMatching('"skillVersion"."prompt"'),
        ]).toEqual([0, 0, 0]);
      });
    });

    describe('when reading the latest release of several packages', () => {
      beforeEach(async () => {
        await repository.createWithVersions(
          releaseOf('5.0.1'),
          pinnedVersions(),
        );
        fixture.queries.reset();

        await repository.findLatestByPackageIds([pkg.id]);
      });

      /*
       * What keeps this read flat in the size of a package's release history:
       * the database returns one row per package instead of the whole history
       * for the newest to be picked out of it in memory.
       */
      it('narrows to one release per package in the database', () => {
        expect(fixture.queries.countMatching('DISTINCT ON')).toBe(1);
      });

      it('issues one statement per artefact family plus the release read', () => {
        expect(fixture.queries.queries).toHaveLength(4);
      });
    });

    describe('when cutting a release', () => {
      beforeEach(async () => {
        fixture.queries.reset();

        await repository.createWithVersions(
          releaseOf('5.1.0'),
          pinnedVersions(),
        );
      });

      it('reads back no pin', () => {
        expect(statementsReadingTwoFamilies()).toEqual([]);
      });
    });
  });

  describe('when a release pins no command', () => {
    beforeEach(async () => {
      await repository.createWithVersions(releaseOf('6.0.0'), {
        recipeVersionIds: [],
        standardVersionIds: [standardVersion.id],
        skillVersionIds: [skillVersion.id],
      });
    });

    it('carries an empty command family', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '6.0.0');

      expect(found?.recipeVersions).toEqual([]);
    });

    it('still carries the families it pinned', async () => {
      const found = await repository.findByPackageIdAndVersion(pkg.id, '6.0.0');

      expect([
        found?.standardVersions.map((version) => version.id),
        found?.skillVersions.map((version) => version.id),
      ]).toEqual([[standardVersion.id], [skillVersion.id]]);
    });
  });
});
