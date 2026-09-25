import { mockInterface, createMockInstance } from '@packmind/test-utils';
import {
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  PackageRelease,
  PackageReleaseEntry,
  PackageWithArtefacts,
  createPackageReleaseId,
  createSpaceId,
} from '@packmind/types';
import { commandFactory, commandVersionFactory } from '@packmind/commands/test';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import { packageFactory } from '@packmind/deployments/test';
import { v4 as uuidv4 } from 'uuid';
import { PackageContentResolver } from './PackageContentResolver';
import { PackageReleaseService } from './PackageReleaseService';
import { PackageVersionNotAvailableError } from '../../domain/errors/PackageVersionNotAvailableError';

describe('PackageContentResolver', () => {
  let commandsPort: jest.Mocked<ICommandsPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let packageReleaseService: jest.Mocked<PackageReleaseService>;
  let resolver: PackageContentResolver;

  const spaceId = createSpaceId(uuidv4());
  const liveSkill = skillFactory();
  const liveSkillVersion = skillVersionFactory({
    skillId: liveSkill.id,
    version: 2,
    slug: 'optimizing-queries',
  });
  const releasedSkillVersion = skillVersionFactory({
    skillId: liveSkill.id,
    version: 1,
    slug: 'optimizing-queries',
  });
  const liveCommand = commandFactory();
  const liveCommandVersion = commandVersionFactory({
    recipeId: liveCommand.id,
    version: 3,
  });

  const ops: PackageWithArtefacts = {
    ...packageFactory({ slug: 'ops', spaceId }),
    recipes: [liveCommand],
    standards: [],
    skills: [liveSkill],
  };

  const releaseEntry = (version: string): PackageReleaseEntry => ({
    id: createPackageReleaseId(uuidv4()),
    packageId: ops.id,
    version,
    name: 'Ops',
    description: 'Ops package',
  });

  const releaseContent = (version: string): PackageRelease => ({
    ...releaseEntry(version),
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [releasedSkillVersion],
  });

  beforeEach(() => {
    commandsPort = mockInterface<ICommandsPort>();
    commandsPort.listCommandVersions.mockResolvedValue([liveCommandVersion]);

    standardsPort = mockInterface<IStandardsPort>();
    standardsPort.getLatestStandardVersion.mockResolvedValue(null);

    skillsPort = mockInterface<ISkillsPort>();
    skillsPort.getLatestSkillVersion.mockResolvedValue(liveSkillVersion);
    skillsPort.getSkillFiles.mockResolvedValue([]);

    packageReleaseService = createMockInstance(PackageReleaseService);
    packageReleaseService.listReleases.mockResolvedValue([]);
    packageReleaseService.findContentByVersion.mockResolvedValue(null);

    resolver = new PackageContentResolver(
      commandsPort,
      standardsPort,
      skillsPort,
      packageReleaseService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the spec is the wildcard', () => {
    it('renders the live skill version', async () => {
      const content = await resolver.resolve([
        { pkg: ops, slug: '@space/ops', spec: { kind: 'wildcard' } },
      ]);

      expect(content.skillVersions).toEqual([
        { ...liveSkillVersion, files: [] },
      ]);
    });

    it('records the wildcard as what the package resolved to', async () => {
      const content = await resolver.resolve([
        { pkg: ops, slug: '@space/ops', spec: { kind: 'wildcard' } },
      ]);

      expect(content.resolvedVersions.get(ops.id)).toBe('*');
    });

    it('does not read any release', async () => {
      await resolver.resolve([
        { pkg: ops, slug: '@space/ops', spec: { kind: 'wildcard' } },
      ]);

      expect(packageReleaseService.findContentByVersion).not.toHaveBeenCalled();
    });
  });

  describe('when the spec pins an exact version', () => {
    beforeEach(() => {
      packageReleaseService.findContentByVersion.mockResolvedValue(
        releaseContent('0.1.0'),
      );
    });

    it('renders the version the release pinned, not the live one', async () => {
      const content = await resolver.resolve([
        {
          pkg: ops,
          slug: '@space/ops',
          spec: { kind: 'exact', version: '0.1.0' },
        },
      ]);

      expect(content.skillVersions).toEqual([
        { ...releasedSkillVersion, files: [] },
      ]);
    });

    it('records the pinned version as what the package resolved to', async () => {
      const content = await resolver.resolve([
        {
          pkg: ops,
          slug: '@space/ops',
          spec: { kind: 'exact', version: '0.1.0' },
        },
      ]);

      expect(content.resolvedVersions.get(ops.id)).toBe('0.1.0');
    });

    it('leaves out a component the release did not pin', async () => {
      const content = await resolver.resolve([
        {
          pkg: ops,
          slug: '@space/ops',
          spec: { kind: 'exact', version: '0.1.0' },
        },
      ]);

      expect(content.commandVersions).toEqual([]);
    });
  });

  describe('when no version is named', () => {
    describe('and the package has releases', () => {
      beforeEach(() => {
        packageReleaseService.listReleases.mockResolvedValue([
          releaseEntry('0.9.0'),
          releaseEntry('0.10.0'),
          releaseEntry('0.2.0'),
        ]);
        packageReleaseService.findContentByVersion.mockResolvedValue(
          releaseContent('0.10.0'),
        );
      });

      it('resolves to the newest release by triple, not by string order', async () => {
        const content = await resolver.resolve([
          { pkg: ops, slug: '@space/ops', spec: null },
        ]);

        expect(content.resolvedVersions.get(ops.id)).toBe('0.10.0');
      });

      it('reads that release', async () => {
        await resolver.resolve([{ pkg: ops, slug: '@space/ops', spec: null }]);

        expect(packageReleaseService.findContentByVersion).toHaveBeenCalledWith(
          ops.id,
          '0.10.0',
        );
      });
    });

    describe('and the package was never released', () => {
      it('falls back to the live package', async () => {
        const content = await resolver.resolve([
          { pkg: ops, slug: '@space/ops', spec: null },
        ]);

        expect(content.resolvedVersions.get(ops.id)).toBe('*');
      });
    });
  });

  describe('when the pinned version does not exist', () => {
    beforeEach(() => {
      packageReleaseService.listReleases.mockResolvedValue([
        releaseEntry('0.0.1'),
        releaseEntry('0.1.0'),
      ]);
    });

    it('refuses with the available versions, latest first', async () => {
      await expect(
        resolver.resolve([
          {
            pkg: ops,
            slug: '@space/ops',
            spec: { kind: 'exact', version: '0.2.0' },
          },
        ]),
      ).rejects.toThrow(
        'Package @space/ops has no version 0.2.0. Available versions, latest first: 0.1.0, 0.0.1',
      );
    });

    it('refuses with a PackageVersionNotAvailableError', async () => {
      await expect(
        resolver.resolve([
          {
            pkg: ops,
            slug: '@space/ops',
            spec: { kind: 'exact', version: '0.2.0' },
          },
        ]),
      ).rejects.toBeInstanceOf(PackageVersionNotAvailableError);
    });
  });

  describe('when two packages share a component', () => {
    const otherPackage: PackageWithArtefacts = {
      ...packageFactory({ slug: 'security', spaceId }),
      recipes: [],
      standards: [],
      skills: [liveSkill],
    };

    it('reads the shared version once', async () => {
      await resolver.resolve([
        { pkg: ops, slug: '@space/ops', spec: { kind: 'wildcard' } },
        {
          pkg: otherPackage,
          slug: '@space/security',
          spec: { kind: 'wildcard' },
        },
      ]);

      expect(skillsPort.getLatestSkillVersion).toHaveBeenCalledTimes(1);
    });

    it('renders the shared component once', async () => {
      const content = await resolver.resolve([
        { pkg: ops, slug: '@space/ops', spec: { kind: 'wildcard' } },
        {
          pkg: otherPackage,
          slug: '@space/security',
          spec: { kind: 'wildcard' },
        },
      ]);

      expect(content.skillVersions).toHaveLength(1);
    });

    it('attributes the shared component to both packages', async () => {
      const content = await resolver.resolve([
        { pkg: ops, slug: '@space/ops', spec: { kind: 'wildcard' } },
        {
          pkg: otherPackage,
          slug: '@space/security',
          spec: { kind: 'wildcard' },
        },
      ]);

      expect(
        content.artifactMetadata.skill.get(liveSkill.id as string)?.packageIds,
      ).toEqual([ops.id as string, otherPackage.id as string]);
    });
  });
});
