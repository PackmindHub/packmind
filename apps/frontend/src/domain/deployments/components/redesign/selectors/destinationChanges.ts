import type { PackageReleaseContent } from '@packmind/types';

import type {
  DriftArtifactEntry,
  InstallDriftEntry,
} from './installDriftEntries';
import type { ArtifactKind } from '../types';

/**
 * What a distribution would do to one component of one destination.
 *
 * The three verbs a reader cares about before they press Distribute, and the
 * only three a push can perform: a component the destination does not have yet,
 * one it has that is about to go, and one it has at an older version.
 */
export type ChangeAction = 'added' | 'updated' | 'removed';

export type ComponentChange = {
  /** Stable across renders: the component's own id, which a release diff joins on. */
  key: string;
  kind: ArtifactKind;
  name: string;
  /**
   * The version the destination holds today, null when it holds nothing.
   *
   * Null rather than zero: a component that has never landed there has no
   * version, and `v0` is a version that does not exist. The pending half of the
   * drift read carries zero for exactly that case, so it is mapped out here
   * rather than printed.
   */
  fromVersion: number | null;
  /** The version the push would leave, null when the component goes away. */
  toVersion: number | null;
};

export type DestinationChanges = {
  added: ComponentChange[];
  updated: ComponentChange[];
  removed: ComponentChange[];
};

/** How many components this distribution would touch, across the three groups. */
export function changeCount(changes: DestinationChanges): number {
  return changes.added.length + changes.updated.length + changes.removed.length;
}

const KIND_ORDER: Record<ArtifactKind, number> = {
  standard: 0,
  command: 1,
  skill: 2,
};

/**
 * Inside a group, by family and then by name.
 *
 * The grouping the reader asked for is by action, which leaves the order within
 * a group free; keeping the family order the package's own list uses means a
 * standard sits where a standard always sits.
 */
function sortChanges(changes: ComponentChange[]): ComponentChange[] {
  return [...changes].sort((a, b) => {
    const kind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kind !== 0) return kind;
    return a.name.localeCompare(b.name);
  });
}

function sorted(changes: DestinationChanges): DestinationChanges {
  return {
    added: sortChanges(changes.added),
    updated: sortChanges(changes.updated),
    removed: sortChanges(changes.removed),
  };
}

/** A version number the destination actually holds, or null for the absent one. */
function heldVersion(version: number): number | null {
  return version > 0 ? version : null;
}

function toChange(late: DriftArtifactEntry): ComponentChange {
  return {
    key: late.artifact.id,
    kind: late.artifact.kind,
    name: late.artifact.name,
    fromVersion: heldVersion(late.deployedVersion),
    toVersion: heldVersion(late.artifact.packmindVersion),
  };
}

/**
 * What a push would change at a destination tracking the live package.
 *
 * Read straight off the drift entry, because the reason each component is late
 * *is* the action: a component of the package that never landed there is one
 * the push adds, one deleted on Packmind but still sitting in the repository is
 * one it takes away, and one at an older version is one it updates.
 *
 * Says nothing about a pinned destination, whose components all read aligned —
 * that is the pin working — and whose changes come from the releases instead.
 */
export function liveDestinationChanges(
  entry: InstallDriftEntry,
): DestinationChanges {
  const changes: DestinationChanges = { added: [], updated: [], removed: [] };
  for (const late of entry.behindArtifacts) {
    const change = toChange(late);
    if (late.reason === 'not-distributed') changes.added.push(change);
    else if (late.reason === 'needs-removal') {
      changes.removed.push({ ...change, toVersion: null });
    } else changes.updated.push(change);
  }
  return sorted(changes);
}

type PinnedComponent = {
  componentId: string;
  kind: ArtifactKind;
  name: string;
  version: number;
};

/**
 * Every component a release pins, keyed by the component rather than by the
 * revision.
 *
 * The join has to be on `standardId` / `recipeId` / `skillId` and never on the
 * version row's own `id`: a component updated between the two releases has a
 * different version id in each, and keying on it would report every update as a
 * removal followed by an addition.
 */
function pinnedComponents(
  release: PackageReleaseContent,
): Map<string, PinnedComponent> {
  const byComponent = new Map<string, PinnedComponent>();
  for (const version of release.standardVersions) {
    byComponent.set(version.standardId, {
      componentId: version.standardId,
      kind: 'standard',
      name: version.name,
      version: version.version,
    });
  }
  for (const version of release.recipeVersions) {
    byComponent.set(version.recipeId, {
      componentId: version.recipeId,
      kind: 'command',
      name: version.name,
      version: version.version,
    });
  }
  for (const version of release.skillVersions) {
    byComponent.set(version.skillId, {
      componentId: version.skillId,
      kind: 'skill',
      name: version.name,
      version: version.version,
    });
  }
  return byComponent;
}

/**
 * What moving a pinned destination from one release to another would change.
 *
 * Both releases are immutable cuts, so this is the whole of the answer: what
 * the newer one pins and the older one does not is added, the other way round
 * is removed, and a component both pin at different revisions is updated. A
 * component pinned at the same revision in both is not a change and is absent.
 *
 * The name comes from the newer release, which is the one the repository is
 * about to receive — a component renamed between the two is listed under the
 * name it will land with.
 */
export function releaseDestinationChanges(
  from: PackageReleaseContent,
  to: PackageReleaseContent,
): DestinationChanges {
  const before = pinnedComponents(from);
  const after = pinnedComponents(to);
  const changes: DestinationChanges = { added: [], updated: [], removed: [] };

  for (const [componentId, component] of after) {
    const previous = before.get(componentId);
    if (!previous) {
      changes.added.push({
        key: componentId,
        kind: component.kind,
        name: component.name,
        fromVersion: null,
        toVersion: component.version,
      });
      continue;
    }
    if (previous.version === component.version) continue;
    changes.updated.push({
      key: componentId,
      kind: component.kind,
      name: component.name,
      fromVersion: previous.version,
      toVersion: component.version,
    });
  }

  for (const [componentId, component] of before) {
    if (after.has(componentId)) continue;
    changes.removed.push({
      key: componentId,
      kind: component.kind,
      name: component.name,
      fromVersion: component.version,
      toVersion: null,
    });
  }

  return sorted(changes);
}
