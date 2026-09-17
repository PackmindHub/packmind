import { PackageRelease } from '@packmind/types';
import {
  createCommandVersionId,
  createCommandId,
  createStandardVersionId,
  createStandardId,
  createSkillVersionId,
  createSkillId,
  createPackageReleaseId,
  createPackageId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  PackageGateSnapshot,
  packageNameMatches,
  packageDescriptionMatches,
  componentListMatches,
  pinnedVersionsMatch,
  evaluatePackageReleaseGate,
} from './packageReleaseGateHelpers';

describe('packageReleaseGate', () => {
  // Builder helpers with fixed IDs for consistency
  const cmdId = createCommandId(uuidv4());
  const cmdVersionId = createCommandVersionId(uuidv4());
  const stdId = createStandardId(uuidv4());
  const stdVersionId = createStandardVersionId(uuidv4());
  const skillId = createSkillId(uuidv4());
  const skillVersionId = createSkillVersionId(uuidv4());
  const userId = createUserId(uuidv4());

  const fp = (): PackageGateSnapshot => ({
    name: 'My Package',
    description: 'A test package',
    recipes: [
      {
        id: cmdId as unknown as string,
        latestVersionId: cmdVersionId as unknown as string,
      },
    ],
    standards: [
      {
        id: stdId as unknown as string,
        latestVersionId: stdVersionId as unknown as string,
      },
    ],
    skills: [
      {
        id: skillId as unknown as string,
        latestVersionId: skillVersionId as unknown as string,
      },
    ],
  });

  const releaseBuilder = (
    overrides?: Partial<PackageRelease>,
  ): PackageRelease => {
    const release: PackageRelease = {
      id: createPackageReleaseId(uuidv4()),
      packageId: createPackageId(uuidv4()),
      version: '1.0.0',
      name: 'My Package',
      description: 'A test package',
      recipeVersions: [
        {
          id: cmdVersionId,
          recipeId: cmdId,
          name: 'Command',
          slug: 'command',
          content: 'content',
          version: 1,
          userId: null,
        },
      ],
      standardVersions: [
        {
          id: stdVersionId,
          standardId: stdId,
          name: 'Standard',
          slug: 'standard',
          description: 'Standard desc',
          version: 1,
          scope: null,
        },
      ],
      skillVersions: [
        {
          id: skillVersionId,
          skillId: skillId,
          version: 1,
          userId: userId,
          name: 'Skill',
          slug: 'skill',
          description: 'Skill desc',
          prompt: 'prompt',
        },
      ],
    };

    return { ...release, ...overrides };
  };

  describe('packageNameMatches', () => {
    it('returns true when names are identical', () => {
      expect(packageNameMatches('My Package', 'My Package')).toBe(true);
    });

    it('matches names differing only by surrounding whitespace', () => {
      expect(packageNameMatches('  My Package  ', 'My Package')).toBe(true);
      expect(packageNameMatches('My Package', '  My Package  ')).toBe(true);
      expect(packageNameMatches('  My Package  ', '  My Package  ')).toBe(true);
    });

    it('matches names differing only by case', () => {
      expect(packageNameMatches('My Package', 'my package')).toBe(true);
      expect(packageNameMatches('MY PACKAGE', 'my package')).toBe(true);
      expect(packageNameMatches('My PaCkAgE', 'my package')).toBe(true);
    });

    it('does not match genuinely different names', () => {
      expect(packageNameMatches('My Package', 'Other Package')).toBe(false);
      expect(packageNameMatches('Package', 'Package One')).toBe(false);
    });
  });

  describe('packageDescriptionMatches', () => {
    it('returns true when descriptions are identical', () => {
      expect(
        packageDescriptionMatches('A test package', 'A test package'),
      ).toBe(true);
    });

    it('matches descriptions differing only by surrounding whitespace', () => {
      expect(
        packageDescriptionMatches('  A test package  ', 'A test package'),
      ).toBe(true);
      expect(
        packageDescriptionMatches('A test package', '  A test package  '),
      ).toBe(true);
    });

    it('does NOT match descriptions differing only by case', () => {
      expect(
        packageDescriptionMatches('A test package', 'a test package'),
      ).toBe(false);
      expect(
        packageDescriptionMatches('A Test Package', 'a test package'),
      ).toBe(false);
    });

    it('does not match genuinely different descriptions', () => {
      expect(
        packageDescriptionMatches('A test package', 'A different package'),
      ).toBe(false);
    });
  });

  describe('componentListMatches', () => {
    it('returns true when component lists are identical', () => {
      const pkg = fp();
      const release = releaseBuilder();

      expect(componentListMatches(pkg, release)).toBe(true);
    });

    it('matches component lists in different order', () => {
      const cmdId2 = createCommandId(uuidv4());
      const cmdVersionId2 = createCommandVersionId(uuidv4());

      const pkg: PackageGateSnapshot = {
        ...fp(),
        recipes: [
          {
            id: cmdId2 as unknown as string,
            latestVersionId: cmdVersionId2 as unknown as string,
          },
          {
            id: cmdId as unknown as string,
            latestVersionId: cmdVersionId as unknown as string,
          },
        ],
        standards: [
          {
            id: stdId as unknown as string,
            latestVersionId: stdVersionId as unknown as string,
          },
        ],
        skills: [
          {
            id: skillId as unknown as string,
            latestVersionId: skillVersionId as unknown as string,
          },
        ],
      };

      const release = releaseBuilder({
        recipeVersions: [
          {
            id: cmdVersionId,
            recipeId: cmdId,
            name: 'Command 1',
            slug: 'command-1',
            content: 'content',
            version: 1,
            userId: null,
          },
          {
            id: cmdVersionId2,
            recipeId: cmdId2,
            name: 'Command 2',
            slug: 'command-2',
            content: 'content',
            version: 1,
            userId: null,
          },
        ],
        standardVersions: [
          {
            id: stdVersionId,
            standardId: stdId,
            name: 'Standard',
            slug: 'standard',
            description: 'Standard desc',
            version: 1,
            scope: null,
          },
        ],
        skillVersions: [
          {
            id: skillVersionId,
            skillId: skillId,
            version: 1,
            userId: userId,
            name: 'Skill',
            slug: 'skill',
            description: 'Skill desc',
            prompt: 'prompt',
          },
        ],
      });

      expect(componentListMatches(pkg, release)).toBe(true);
    });

    it('does not match when one component is added', () => {
      const pkg: PackageGateSnapshot = {
        ...fp(),
        recipes: [
          { id: 'cmd-1', latestVersionId: 'cmd-ver-1' },
          { id: 'cmd-2', latestVersionId: 'cmd-ver-2' },
        ],
        standards: [{ id: 'std-1', latestVersionId: 'std-ver-1' }],
        skills: [{ id: 'skill-1', latestVersionId: 'skill-ver-1' }],
      };

      const release = releaseBuilder();

      expect(componentListMatches(pkg, release)).toBe(false);
    });

    it('does not match when one component is removed', () => {
      const pkg: PackageGateSnapshot = {
        ...fp(),
        recipes: [],
        standards: [{ id: 'std-1', latestVersionId: 'std-ver-1' }],
        skills: [{ id: 'skill-1', latestVersionId: 'skill-ver-1' }],
      };

      const release = releaseBuilder();

      expect(componentListMatches(pkg, release)).toBe(false);
    });
  });

  describe('pinnedVersionsMatch', () => {
    it('returns true when every component has the same pinned version id', () => {
      const pkg = fp();
      const release = releaseBuilder();

      expect(pinnedVersionsMatch(pkg, release)).toBe(true);
    });

    it('returns false when one component has a newer version id', () => {
      const pkg: PackageGateSnapshot = {
        ...fp(),
        recipes: [{ id: 'cmd-1', latestVersionId: 'cmd-ver-2' }],
        standards: [{ id: 'std-1', latestVersionId: 'std-ver-1' }],
        skills: [{ id: 'skill-1', latestVersionId: 'skill-ver-1' }],
      };

      const release = releaseBuilder();

      expect(pinnedVersionsMatch(pkg, release)).toBe(false);
    });

    it('does not throw when component list does not match', () => {
      const pkg: PackageGateSnapshot = {
        ...fp(),
        recipes: [{ id: 'cmd-2', latestVersionId: 'cmd-ver-2' }],
      };

      const release = releaseBuilder();

      // Should not throw, just return false
      expect(() => pinnedVersionsMatch(pkg, release)).not.toThrow();
      expect(pinnedVersionsMatch(pkg, release)).toBe(false);
    });
  });

  describe('evaluatePackageReleaseGate', () => {
    describe('when package is empty', () => {
      it('returns no_components when package has never been released', () => {
        const pkg: PackageGateSnapshot = {
          name: 'Empty Package',
          description: 'Empty',
          recipes: [],
          standards: [],
          skills: [],
        };

        expect(evaluatePackageReleaseGate(pkg, null)).toBe('no_components');
      });

      it('returns no_components when package HAS been released', () => {
        const pkg: PackageGateSnapshot = {
          name: 'Empty Package',
          description: 'Empty',
          recipes: [],
          standards: [],
          skills: [],
        };

        const release = releaseBuilder({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
        });

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('no_components');
      });
    });

    describe('when package has components', () => {
      it('returns ready when package has never been released', () => {
        const pkg = fp();

        expect(evaluatePackageReleaseGate(pkg, null)).toBe('ready');
      });

      it('returns no_change when package is identical to its latest release', () => {
        const pkg = fp();
        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('no_change');
      });

      it('returns no_change when the name differs only by surrounding whitespace', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          name: '  My Package  ',
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('no_change');
      });

      it('returns no_change when the name differs only by case', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          name: 'MY PACKAGE',
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('no_change');
      });

      it('returns ready when package name changed', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          name: 'Renamed Package',
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
      });

      it('returns ready when package description changed', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          description: 'Updated description',
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
      });

      it('returns ready when a component is added', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          recipes: [
            { id: 'cmd-1', latestVersionId: 'cmd-ver-1' },
            { id: 'cmd-2', latestVersionId: 'cmd-ver-2' },
          ],
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
      });

      it('returns ready when a component is removed', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          recipes: [],
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
      });

      it('returns no_change when a component is added and then removed', () => {
        // Setup: original release has cmd-1, std-1, skill-1
        const release = releaseBuilder();
        // Current package also has cmd-1, std-1, skill-1 (same as original)
        // This represents: a component was added then removed, returning to original state
        const pkg = fp();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('no_change');
      });

      it('returns ready when a pinned component has a newer version available', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          recipes: [{ id: 'cmd-1', latestVersionId: 'cmd-ver-2' }],
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
      });

      it('returns ready when component list is unchanged but name differs', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          name: 'Different Name',
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
      });

      it('packageReleaseGate: a component with no version, added after the last release, yields ready', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          recipes: [
            ...fp().recipes,
            {
              id: 'cmd-no-version',
              latestVersionId: null,
            },
          ],
        };

        const release = releaseBuilder();

        expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
      });

      it('packageReleaseGate: a package whose only component has no version does not report no_components', () => {
        const pkg: PackageGateSnapshot = {
          name: 'Package with unresolved component',
          description: 'A package with one unresolved component',
          recipes: [
            {
              id: 'cmd-no-version',
              latestVersionId: null,
            },
          ],
          standards: [],
          skills: [],
        };

        const release = releaseBuilder({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
        });

        const verdict = evaluatePackageReleaseGate(pkg, release);
        expect(verdict).not.toBe('no_components');
        expect(verdict).toBe('ready');
      });
    });
  });
});
