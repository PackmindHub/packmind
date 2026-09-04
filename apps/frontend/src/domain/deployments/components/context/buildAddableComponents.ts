import type {
  CommandId,
  PackageResponse,
  SkillId,
  StandardId,
} from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS,
  COMPONENT_TYPE_ORDER,
  commandToComponent,
  componentSelectionKey,
  skillToComponent,
  standardToComponent,
  type ContextComponent,
  type ContextComponentType,
  type ContextLinkTarget,
  type PackageComponentIds,
  type SpaceCatalogue,
} from './buildPackageContext';
import {
  buildOwnerIndex,
  isOrphan,
  type InventoryEntry,
  type InventoryGroup,
} from './buildSpaceInventory';

/**
 * What a package could still be given, and how much there was to give.
 *
 * Three counts, because three different questions are asked of this list.
 * `total` is how many candidates exist at all, `freeTotal` is how many of them
 * no package carries — the ones the picker opens on — and `catalogueTotal` is
 * how many components the space owns, which is what tells an empty picker which
 * of two things happened: a space with nothing in it yet, or a package that
 * already holds everything there is. The grouped list cannot answer that on its
 * own, because both cases arrive here as zero groups.
 */
export type AddableComponents = {
  groups: InventoryGroup[];
  total: number;
  freeTotal: number;
  catalogueTotal: number;
};

/**
 * The complement of `buildPackageContext`: the components of the space that
 * this package does not carry, grouped by type, each with the packages that
 * already carry it.
 *
 * Built from the same inputs as the pane's own content, and through the same
 * three mappers, so a row offered for adding is the same object as the row it
 * becomes once added: one name, one summary, one version, decided in one place.
 * The picker renders it differently, because a candidate is ticked where a
 * member is opened, but it is not describing a different thing.
 *
 * The rows are `InventoryEntry`, the row of the space inventory, rather than a
 * bare component. The picker's whole job is now telling apart a component
 * nothing distributes from one that already ships somewhere, and that is the
 * fact the inventory row carries. Two row types would have meant two answers to
 * "which packages hold this" on two screens reading the same memberships.
 *
 * Local, like the move targets: the space catalogue, the package's ids and the
 * space's packages are all already loaded by the Context surface, so nothing
 * here needs the server. Asking it what is addable would also let the picker
 * disagree with the pane behind it.
 *
 * A type with nothing left to add is dropped rather than shown empty, which is
 * what the pane does with a type the package does not carry. Groups are in the
 * pane's order and alphabetical inside it, so the picker reads as the list it
 * is about to add to.
 */
export function buildAddableComponents(
  pkg: PackageComponentIds,
  packages: readonly PackageResponse[],
  catalogue: SpaceCatalogue,
  target: ContextLinkTarget,
): AddableComponents {
  const owners = buildOwnerIndex(packages);

  const byType: Record<ContextComponentType, InventoryEntry[]> = {
    standard: absent(catalogue.standards, pkg.standards, (standard) =>
      standardToComponent(standard, target),
    ).map(withOwners(owners)),
    command: absent(catalogue.commands, pkg.commands, (command) =>
      commandToComponent(command, target),
    ).map(withOwners(owners)),
    skill: absent(catalogue.skills, pkg.skills, (skill) =>
      skillToComponent(skill, target),
    ).map(withOwners(owners)),
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
    total: all.length,
    freeTotal: all.filter(isOrphan).length,
    catalogueTotal:
      catalogue.standards.length +
      catalogue.commands.length +
      catalogue.skills.length,
  };
}

/**
 * How many components a grouped list holds. Exported because the picker asks it
 * twice: once of everything addable, and once of what its filters left, and the
 * second one has no count of its own.
 */
export function groupedComponentCount(
  groups: readonly InventoryGroup[],
): number {
  return groups.reduce((count, group) => count + group.entries.length, 0);
}

/**
 * How many components the space could still give this package, counted without
 * building a single row.
 *
 * The header asks only this, on every render: whether there is anything left to
 * pick is what decides the shape of its add control. `buildAddableComponents`
 * answers it as well, but it resolves three catalogues into rows, sorts each
 * one, and crosses every candidate against every package's memberships to get
 * there. The header reads none of that.
 *
 * It cannot be subtracted out of the two totals either. A package can hold the
 * id of an artefact that has since left the space, and `catalogue - held` would
 * then report a candidate nobody can pick. Counting what the catalogue holds and
 * the package does not is the same question the picker asks, which is why the
 * two agree by construction rather than by both being maintained.
 */
export function countAddableComponents(
  pkg: PackageComponentIds,
  catalogue: SpaceCatalogue,
): number {
  return (
    countAbsent(catalogue.standards, pkg.standards) +
    countAbsent(catalogue.commands, pkg.commands) +
    countAbsent(catalogue.skills, pkg.skills)
  );
}

/**
 * The addable components a query keeps, still grouped, with the groups a query
 * emptied dropped.
 *
 * Name and description, the two fields the rail searches packages by, so a
 * component found from the rail's search is findable here under the same words.
 * A command has no description, only its content, so for that type this is a
 * search on the name alone. Searching the content would find a component by
 * words that are nowhere on the row it returns.
 *
 * Not the package names, although the rows now carry them: the query narrows
 * what could be added, and matching a package would answer a question about
 * where things already are with a list of things that are not there.
 */
export function filterAddableComponents(
  groups: readonly InventoryGroup[],
  query: string,
): InventoryGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...groups];

  return groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter(
        ({ component }) =>
          component.name.toLowerCase().includes(needle) ||
          component.summary.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.entries.length > 0);
}

/**
 * How much of one group the picker is already holding, as the three readings a
 * heading checkbox needs: none of it, part of it, all of it.
 *
 * Resolved against the entries the group is showing, not against every
 * candidate of that type. The group a filter left is the group the reader can
 * see and the only one a control above it can honestly speak for.
 *
 * An empty group reads as `none`, so a heading over no row offers to select
 * nothing rather than claiming to have selected everything.
 */
export function groupPickState(
  pickedKeys: ReadonlySet<string>,
  group: InventoryGroup,
): 'none' | 'some' | 'all' {
  const picked = group.entries.filter(({ component }) =>
    pickedKeys.has(componentSelectionKey(component)),
  ).length;

  if (picked === 0) return 'none';
  return picked === group.entries.length ? 'all' : 'some';
}

/**
 * The picks after a heading checkbox was used, for the group it heads.
 *
 * Adds or removes only the keys of that group, leaving every other pick where
 * it was: the control speaks for the rows under it and a reader who ticked two
 * standards by hand does not expect selecting all the skills to drop them.
 */
export function withGroupPicked(
  pickedKeys: ReadonlySet<string>,
  group: InventoryGroup,
  select: boolean,
): ReadonlySet<string> {
  const next = new Set(pickedKeys);
  for (const { component } of group.entries) {
    const key = componentSelectionKey(component);
    if (select) next.add(key);
    else next.delete(key);
  }
  return next;
}

/**
 * The entities of one catalogue whose id the package does not already hold.
 *
 * The mirror of `resolve` in `buildPackageContext`, down to sorting the rows
 * before mapping them: one comparison per pair on a name the entity already
 * carries, rather than on a row that has yet to be built.
 */
function absent<
  Id extends StandardId | CommandId | SkillId,
  Entity extends { id: Id; name: string },
>(
  catalogue: readonly Entity[],
  held: readonly Id[] | undefined,
  toComponent: (entity: Entity) => ContextComponent,
): ContextComponent[] {
  const inside = new Set<string>(held ?? []);
  return catalogue
    .filter((entity) => !inside.has(entity.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toComponent);
}

/** One catalogue's share of that count. */
function countAbsent<Id extends StandardId | CommandId | SkillId>(
  catalogue: readonly { id: Id }[],
  held: readonly Id[] | undefined,
): number {
  const inside = new Set<string>(held ?? []);
  return catalogue.filter((entity) => !inside.has(entity.id)).length;
}

/** The candidate, plus whoever already carries it. */
function withOwners(
  owners: Map<string, string[]>,
): (component: ContextComponent) => InventoryEntry {
  return (component) => ({
    component,
    packageNames: owners.get(component.key) ?? [],
  });
}
