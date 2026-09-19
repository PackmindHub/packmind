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
    describe('when the names are identical', () => {
      it('matches', () => {
        expect(packageNameMatches('My Package', 'My Package')).toBe(true);
      });
    });

    describe('when the names differ only by surrounding whitespace', () => {
      it.each([
        ['  My Package  ', 'My Package'],
        ['My Package', '  My Package  '],
        ['  My Package  ', '  My Package  '],
      ])('matches "%s" against "%s"', (left, right) => {
        expect(packageNameMatches(left, right)).toBe(true);
      });
    });

    describe('when the names differ only by case', () => {
      it.each([
        ['My Package', 'my package'],
        ['MY PACKAGE', 'my package'],
        ['My PaCkAgE', 'my package'],
      ])('matches "%s" against "%s"', (left, right) => {
        expect(packageNameMatches(left, right)).toBe(true);
      });
    });

    describe('when the names genuinely differ', () => {
      it.each([
        ['My Package', 'Other Package'],
        ['Package', 'Package One'],
      ])('does not match "%s" against "%s"', (left, right) => {
        expect(packageNameMatches(left, right)).toBe(false);
      });
    });
  });

  describe('packageDescriptionMatches', () => {
    describe('when the descriptions are identical', () => {
      it('matches', () => {
        expect(
          packageDescriptionMatches('A test package', 'A test package'),
        ).toBe(true);
      });
    });

    describe('when the descriptions differ only by surrounding whitespace', () => {
      it.each([
        ['  A test package  ', 'A test package'],
        ['A test package', '  A test package  '],
      ])('matches "%s" against "%s"', (left, right) => {
        expect(packageDescriptionMatches(left, right)).toBe(true);
      });
    });

    // Deliberately unlike the name: capitalising a sentence is an edit a
    // writer meant, and should be publishable as a correction (D-008).
    describe('when the descriptions differ only by case', () => {
      it.each([
        ['A test package', 'a test package'],
        ['A Test Package', 'a test package'],
      ])('does not match "%s" against "%s"', (left, right) => {
        expect(packageDescriptionMatches(left, right)).toBe(false);
      });
    });

    describe('when the descriptions genuinely differ', () => {
      it('does not match', () => {
        expect(
          packageDescriptionMatches('A test package', 'A different package'),
        ).toBe(false);
      });
    });
  });

  describe('componentListMatches', () => {
    describe('when the component lists are identical', () => {
      it('matches', () => {
        const pkg = fp();
        const release = releaseBuilder();

        expect(componentListMatches(pkg, release)).toBe(true);
      });
    });

    describe('when the same components arrive in a different order', () => {
      it('matches', () => {
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
    });

    describe('when one component is added', () => {
      it('does not match', () => {
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
    });

    describe('when one component is removed', () => {
      it('does not match', () => {
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
  });

  describe('pinnedVersionsMatch', () => {
    describe('when every component sits on the version the release pinned', () => {
      it('matches', () => {
        const pkg = fp();
        const release = releaseBuilder();

        expect(pinnedVersionsMatch(pkg, release)).toBe(true);
      });
    });

    describe('when one component has a newer version id', () => {
      it('does not match', () => {
        const pkg: PackageGateSnapshot = {
          ...fp(),
          recipes: [{ id: 'cmd-1', latestVersionId: 'cmd-ver-2' }],
          standards: [{ id: 'std-1', latestVersionId: 'std-ver-1' }],
          skills: [{ id: 'skill-1', latestVersionId: 'skill-ver-1' }],
        };

        const release = releaseBuilder();

        expect(pinnedVersionsMatch(pkg, release)).toBe(false);
      });
    });

    describe('when the component lists do not match', () => {
      const pkg: PackageGateSnapshot = {
        ...fp(),
        recipes: [{ id: 'cmd-2', latestVersionId: 'cmd-ver-2' }],
      };

      it('does not throw', () => {
        expect(() => pinnedVersionsMatch(pkg, releaseBuilder())).not.toThrow();
      });

      it('does not match', () => {
        expect(pinnedVersionsMatch(pkg, releaseBuilder())).toBe(false);
      });
    });
  });

  describe('evaluatePackageReleaseGate', () => {
    describe('when the package is empty', () => {
      const pkg: PackageGateSnapshot = {
        name: 'Empty Package',
        description: 'Empty',
        recipes: [],
        standards: [],
        skills: [],
      };

      // Empty beats changed, and it beats the release history too: the order
      // of the gate's checks is the whole point (AC-9).
      describe('when it has never been released', () => {
        it('reports no_components', () => {
          expect(evaluatePackageReleaseGate(pkg, null)).toBe('no_components');
        });
      });

      describe('when it has been released', () => {
        it('reports no_components', () => {
          const release = releaseBuilder({
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          });

          expect(evaluatePackageReleaseGate(pkg, release)).toBe(
            'no_components',
          );
        });
      });
    });

    describe('when the package has components', () => {
      describe('when it has never been released', () => {
        it('is ready', () => {
          expect(evaluatePackageReleaseGate(fp(), null)).toBe('ready');
        });
      });

      describe('when it is identical to its latest release', () => {
        it('reports no_change', () => {
          expect(evaluatePackageReleaseGate(fp(), releaseBuilder())).toBe(
            'no_change',
          );
        });
      });

      describe('when the name differs only by surrounding whitespace', () => {
        it('reports no_change', () => {
          const pkg: PackageGateSnapshot = { ...fp(), name: '  My Package  ' };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'no_change',
          );
        });
      });

      describe('when the name differs only by case', () => {
        it('reports no_change', () => {
          const pkg: PackageGateSnapshot = { ...fp(), name: 'MY PACKAGE' };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'no_change',
          );
        });
      });

      describe('when the name changed', () => {
        it('is ready', () => {
          const pkg: PackageGateSnapshot = { ...fp(), name: 'Renamed Package' };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'ready',
          );
        });
      });

      describe('when the description changed', () => {
        it('is ready', () => {
          const pkg: PackageGateSnapshot = {
            ...fp(),
            description: 'Updated description',
          };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'ready',
          );
        });
      });

      describe('when a component is added', () => {
        it('is ready', () => {
          const pkg: PackageGateSnapshot = {
            ...fp(),
            recipes: [
              { id: 'cmd-1', latestVersionId: 'cmd-ver-1' },
              { id: 'cmd-2', latestVersionId: 'cmd-ver-2' },
            ],
          };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'ready',
          );
        });
      });

      describe('when a component is removed', () => {
        it('is ready', () => {
          const pkg: PackageGateSnapshot = { ...fp(), recipes: [] };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'ready',
          );
        });
      });

      // The gate is stateless (D-006), so "added and then removed" IS the
      // identical state; there is no sequence to drive and nothing else for it
      // to be.
      describe('when a component is added and then removed', () => {
        it('reports no_change', () => {
          expect(evaluatePackageReleaseGate(fp(), releaseBuilder())).toBe(
            'no_change',
          );
        });
      });

      describe('when a pinned component has a newer version available', () => {
        it('is ready', () => {
          const pkg: PackageGateSnapshot = {
            ...fp(),
            recipes: [{ id: 'cmd-1', latestVersionId: 'cmd-ver-2' }],
          };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'ready',
          );
        });
      });

      describe('when the component list is unchanged but the name differs', () => {
        it('is ready', () => {
          const pkg: PackageGateSnapshot = { ...fp(), name: 'Different Name' };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'ready',
          );
        });
      });

      describe('when a component added since the last release has no version', () => {
        it('is ready', () => {
          const pkg: PackageGateSnapshot = {
            ...fp(),
            recipes: [
              ...fp().recipes,
              { id: 'cmd-no-version', latestVersionId: null },
            ],
          };

          expect(evaluatePackageReleaseGate(pkg, releaseBuilder())).toBe(
            'ready',
          );
        });
      });

      // D-059: omitting a versionless component from the snapshot made a
      // package that has one look empty.
      describe('when the only component the package holds has no version', () => {
        const pkg: PackageGateSnapshot = {
          name: 'Package with unresolved component',
          description: 'A package with one unresolved component',
          recipes: [{ id: 'cmd-no-version', latestVersionId: null }],
          standards: [],
          skills: [],
        };
        const release = releaseBuilder({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
        });

        it('does not report no_components', () => {
          expect(evaluatePackageReleaseGate(pkg, release)).not.toBe(
            'no_components',
          );
        });

        it('is ready', () => {
          expect(evaluatePackageReleaseGate(pkg, release)).toBe('ready');
        });
      });
    });
  });
});
