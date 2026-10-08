import {
  createCommandId,
  createCommandVersionId,
  createSkillId,
  createSkillVersionId,
  createStandardId,
  createStandardVersionId,
  type PackageReleaseContent,
} from '@packmind/types';

import {
  changeCount,
  liveDestinationChanges,
  releaseDestinationChanges,
} from './destinationChanges';
import type {
  DriftArtifactEntry,
  InstallDriftEntry,
} from './installDriftEntries';
import type { ArtifactKind } from '../types';

const late = (
  name: string,
  reason: DriftArtifactEntry['reason'],
  deployedVersion: number,
  packmindVersion: number,
  kind: ArtifactKind = 'standard',
): DriftArtifactEntry =>
  ({
    artifact: { id: `art-${name}`, kind, name, packmindVersion },
    reason,
    deployedVersion,
    lastDeployedAt: '',
  }) as unknown as DriftArtifactEntry;

const tracking = (behindArtifacts: DriftArtifactEntry[]): InstallDriftEntry =>
  ({ behindArtifacts }) as unknown as InstallDriftEntry;

const release = (
  overrides: Partial<PackageReleaseContent> = {},
): PackageReleaseContent =>
  ({
    version: '0.1.0',
    standardVersions: [],
    recipeVersions: [],
    skillVersions: [],
    ...overrides,
  }) as PackageReleaseContent;

const pinnedStandard = (id: string, name: string, version: number) => ({
  id: createStandardVersionId(`${id}-v${version}`),
  standardId: createStandardId(id),
  name,
  version,
});

const pinnedCommand = (id: string, name: string, version: number) => ({
  id: createCommandVersionId(`${id}-v${version}`),
  recipeId: createCommandId(id),
  name,
  version,
});

const pinnedSkill = (id: string, name: string, version: number) => ({
  id: createSkillVersionId(`${id}-v${version}`),
  skillId: createSkillId(id),
  name,
  version,
});

describe('liveDestinationChanges', () => {
  describe('when a component of the package never landed there', () => {
    const changes = liveDestinationChanges(
      tracking([late('Naming', 'not-distributed', 0, 0)]),
    );

    it('reads as added', () => {
      expect(changes.added.map((c) => c.name)).toEqual(['Naming']);
    });

    it('claims no version it does not hold', () => {
      expect(changes.added[0].fromVersion).toBeNull();
    });
  });

  describe('when a component was deleted on Packmind', () => {
    const changes = liveDestinationChanges(
      tracking([late('Legacy', 'needs-removal', 3, 4)]),
    );

    it('reads as removed', () => {
      expect(changes.removed.map((c) => c.name)).toEqual(['Legacy']);
    });

    it('names the version the repository is losing', () => {
      expect(changes.removed[0].fromVersion).toBe(3);
    });

    it('sends it nowhere', () => {
      expect(changes.removed[0].toVersion).toBeNull();
    });
  });

  describe('when a component sits at an older version', () => {
    const changes = liveDestinationChanges(
      tracking([late('Testing', 'behind', 2, 5)]),
    );

    it('reads as updated', () => {
      expect(changes.updated.map((c) => c.name)).toEqual(['Testing']);
    });

    it('names the move it makes', () => {
      expect([
        changes.updated[0].fromVersion,
        changes.updated[0].toVersion,
      ]).toEqual([2, 5]);
    });
  });

  describe('when the three actions are mixed', () => {
    const changes = liveDestinationChanges(
      tracking([
        late('Testing', 'behind', 2, 5),
        late('Legacy', 'needs-removal', 3, 4),
        late('Naming', 'not-distributed', 0, 0),
      ]),
    );

    it('counts every one of them', () => {
      expect(changeCount(changes)).toBe(3);
    });

    it('puts each under its own action', () => {
      expect([
        changes.added.length,
        changes.updated.length,
        changes.removed.length,
      ]).toEqual([1, 1, 1]);
    });
  });

  describe('when a group holds several families', () => {
    it('orders them standard, command, skill and then by name', () => {
      const changes = liveDestinationChanges(
        tracking([
          late('Deploy', 'behind', 1, 2, 'skill'),
          late('Build', 'behind', 1, 2, 'command'),
          late('Naming', 'behind', 1, 2, 'standard'),
          late('Architecture', 'behind', 1, 2, 'standard'),
        ]),
      );

      expect(changes.updated.map((c) => c.name)).toEqual([
        'Architecture',
        'Naming',
        'Build',
        'Deploy',
      ]);
    });
  });

  describe('when nothing is late', () => {
    it('reports no change', () => {
      expect(changeCount(liveDestinationChanges(tracking([])))).toBe(0);
    });
  });
});

describe('releaseDestinationChanges', () => {
  describe('when the newer release pins a component the older one did not', () => {
    const changes = releaseDestinationChanges(
      release({ standardVersions: [] }),
      release({ standardVersions: [pinnedStandard('std-1', 'Naming', 4)] }),
    );

    it('reads as added', () => {
      expect(changes.added.map((c) => c.name)).toEqual(['Naming']);
    });

    it('names the version it arrives at', () => {
      expect(changes.added[0].toVersion).toBe(4);
    });
  });

  describe('when the older release pins a component the newer one dropped', () => {
    const changes = releaseDestinationChanges(
      release({ recipeVersions: [pinnedCommand('cmd-1', 'Release', 2)] }),
      release({ recipeVersions: [] }),
    );

    it('reads as removed', () => {
      expect(changes.removed.map((c) => c.name)).toEqual(['Release']);
    });

    it('names the version the repository is losing', () => {
      expect(changes.removed[0].fromVersion).toBe(2);
    });
  });

  describe('when both pin the same component at different revisions', () => {
    const changes = releaseDestinationChanges(
      release({ skillVersions: [pinnedSkill('skl-1', 'Onboard', 1)] }),
      release({ skillVersions: [pinnedSkill('skl-1', 'Onboard', 7)] }),
    );

    it('reads as updated rather than as a removal and an addition', () => {
      expect(changeCount(changes)).toBe(1);
    });

    it('names the move it makes', () => {
      expect([
        changes.updated[0].fromVersion,
        changes.updated[0].toVersion,
      ]).toEqual([1, 7]);
    });
  });

  describe('when a component was renamed between the two releases', () => {
    it('lists it under the name it will land with', () => {
      const changes = releaseDestinationChanges(
        release({ standardVersions: [pinnedStandard('std-1', 'Old name', 1)] }),
        release({ standardVersions: [pinnedStandard('std-1', 'New name', 2)] }),
      );

      expect(changes.updated.map((c) => c.name)).toEqual(['New name']);
    });
  });

  describe('when both releases pin the same component at the same revision', () => {
    it('reports no change for it', () => {
      const changes = releaseDestinationChanges(
        release({ standardVersions: [pinnedStandard('std-1', 'Naming', 4)] }),
        release({ standardVersions: [pinnedStandard('std-1', 'Naming', 4)] }),
      );

      expect(changeCount(changes)).toBe(0);
    });
  });

  describe('when the two releases differ across the three families', () => {
    const changes = releaseDestinationChanges(
      release({
        standardVersions: [pinnedStandard('std-1', 'Naming', 1)],
        recipeVersions: [pinnedCommand('cmd-1', 'Release', 2)],
      }),
      release({
        standardVersions: [pinnedStandard('std-1', 'Naming', 3)],
        skillVersions: [pinnedSkill('skl-1', 'Onboard', 1)],
      }),
    );

    it('puts each under its own action', () => {
      expect([
        changes.added.map((c) => c.name),
        changes.updated.map((c) => c.name),
        changes.removed.map((c) => c.name),
      ]).toEqual([['Onboard'], ['Naming'], ['Release']]);
    });
  });
});
