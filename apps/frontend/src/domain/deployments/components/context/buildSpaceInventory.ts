import type { PackageResponse } from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS,
  COMPONENT_TYPE_ORDER,
  commandToComponent,
  skillToComponent,
  standardToComponent,
  type ContextComponent,
  type ContextComponentType,
  type ContextLinkTarget,
  type SpaceCatalogue,
} from './buildPackageContext';

/**
 * One component of the space, and the packages that carry it.
 *
 * The prototype this comes from had a single owner per component, so its
 * inventory printed one Plugin column and read a repeated name as three copies
 * of the same standard. Here a component is referenced by any number of
 * packages, so the column has to say how many, and — the reason this surface
 * exists — it has to be able to say none.
 */
export type InventoryEntry = {
  component: ContextComponent;
  /** Names of the packages referencing it, sorted. Empty means no package. */
  packageNames: string[];
};

export type InventoryGroup = {
  type: ContextComponentType;
  label: string;
  entries: InventoryEntry[];
};

/**
 * Which components the inventory shows.
 *
 * A second axis beside the type, and deliberately not a fourth chip in the row
 * of types: those are one choice among the kinds of thing a space owns, and
 * coverage is a different question about the same list. Sharing a row would let
 * two of them be active at once with neither meaning anything.
 *
 * `none` is the string the address carries too, so the surface, the pane and
 * the URL all say coverage the same way.
 */
export type InventoryCoverage = 'all' | 'none';

export type SpaceInventory = {
  groups: InventoryGroup[];
  countsByType: Record<ContextComponentType, number>;
  total: number;
  /**
   * Components no package carries. They are distributed to nobody and, in the
   * plugin-first navigation, this list is the only place they appear at all.
   */
  orphanCount: number;
};

/**
 * Everything the space owns, whatever package carries it, grouped by type.
 *
 * Built from the catalogues rather than from the packages, which is what makes
 * it complete: walking the packages would only ever find what is already in
 * one, and the components in none are exactly the ones worth surfacing. The
 * per-type navigation entries used to answer this question once per type; this
 * answers it once, and a new type adds a group rather than a place to go.
 */
export function buildSpaceInventory(
  packages: readonly PackageResponse[],
  catalogue: SpaceCatalogue,
  target: ContextLinkTarget,
): SpaceInventory {
  const owners = buildOwnerIndex(packages);

  const byType: Record<ContextComponentType, InventoryEntry[]> = {
    standard: entriesFor(
      catalogue.standards.map((standard) =>
        standardToComponent(standard, target),
      ),
      owners,
    ),
    command: entriesFor(
      catalogue.commands.map((command) => commandToComponent(command, target)),
      owners,
    ),
    skill: entriesFor(
      catalogue.skills.map((skill) => skillToComponent(skill, target)),
      owners,
    ),
  };

  const groups = COMPONENT_TYPE_ORDER.filter(
    (type) => byType[type].length > 0,
  ).map((type) => ({
    type,
    label: COMPONENT_TYPE_LABELS[type],
    entries: byType[type],
  }));

  const all = COMPONENT_TYPE_ORDER.flatMap((type) => byType[type]);

  return {
    groups,
    countsByType: {
      standard: byType.standard.length,
      command: byType.command.length,
      skill: byType.skill.length,
    },
    total: all.length,
    orphanCount: all.filter(isOrphan).length,
  };
}

/** No package carries it, so nothing distributes it. */
export function isOrphan(entry: InventoryEntry): boolean {
  return entry.packageNames.length === 0;
}

/**
 * The groups the inventory shows under a coverage filter.
 *
 * Separate from `buildSpaceInventory`, which stays the whole truth about the
 * space: the counts the chips and the toggle are labelled with have to keep
 * counting the space and not the current view, or turning a filter on would
 * renumber the control that turned it on.
 *
 * The order changes with the filter, on purpose. Alphabetical is how a
 * catalogue is read, and a name is what the eye runs down when looking
 * something up. The components in no package are not being looked up, they are
 * being worked through, and the newest is the one most likely to be a component
 * created a moment ago and not yet placed. Empty groups are dropped rather than
 * shown empty, so a type that has no orphan does not read as a heading with a
 * missing list under it.
 */
export function filterInventoryGroups(
  groups: readonly InventoryGroup[],
  coverage: InventoryCoverage,
): InventoryGroup[] {
  if (coverage === 'all') return [...groups];

  return groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter(isOrphan).sort(byNewestFirst),
    }))
    .filter((group) => group.entries.length > 0);
}

/**
 * Newest first, by the date the API sent. ISO strings compare in chronological
 * order, so no parsing is needed to order them.
 *
 * A row with no date sinks to the bottom instead of to one end of the sequence:
 * it cannot be placed in it, and the whole point of the order is the head of
 * the list. Two rows the sort cannot separate fall back to the name, so the
 * list is stable and never reshuffles between two renders.
 */
function byNewestFirst(a: InventoryEntry, b: InventoryEntry): number {
  const left = a.component.createdAt;
  const right = b.component.createdAt;

  if (left !== right) {
    if (!left) return 1;
    if (!right) return -1;
    return left < right ? 1 : -1;
  }

  return a.component.name.localeCompare(b.component.name);
}

/**
 * Component id to the names of the packages referencing it. Built once for the
 * whole space rather than searched per component, so the inventory stays linear
 * in the number of components instead of multiplying by the packages.
 */
function buildOwnerIndex(
  packages: readonly PackageResponse[],
): Map<string, string[]> {
  const owners = new Map<string, string[]>();

  const record = (componentId: string, packageName: string) => {
    const existing = owners.get(componentId);
    if (existing) {
      existing.push(packageName);
      return;
    }
    owners.set(componentId, [packageName]);
  };

  for (const pkg of packages) {
    for (const id of pkg.standards ?? []) record(id, pkg.name);
    for (const id of pkg.commands ?? []) record(id, pkg.name);
    for (const id of pkg.skills ?? []) record(id, pkg.name);
  }

  for (const names of owners.values()) {
    names.sort((a, b) => a.localeCompare(b));
  }

  return owners;
}

/**
 * Sorted by name rather than kept in catalogue order: read across the space,
 * the name is what the eye runs down, and two packages carrying the same
 * standard have to land on the same row rather than on two.
 */
function entriesFor(
  components: readonly ContextComponent[],
  owners: Map<string, string[]>,
): InventoryEntry[] {
  return components
    .map((component) => ({
      component,
      packageNames: owners.get(component.key) ?? [],
    }))
    .sort((a, b) => a.component.name.localeCompare(b.component.name));
}
