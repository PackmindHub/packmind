import type {
  CommandId,
  PackageId,
  PackageResponse,
  SkillId,
  StandardId,
} from '@packmind/types';
import type {
  ContextComponent,
  PackageComponentIds,
} from './buildPackageContext';

/**
 * The ids a set of components is addressed by when a package's membership is
 * changed. A type with nothing picked is absent rather than empty: the two
 * mutations take a bag of per-type arrays, and sending an empty array for a
 * type the user did not touch would be a different statement than not sending
 * it.
 */
export type ComponentIdsPayload = {
  standardIds?: StandardId[];
  commandIds?: CommandId[];
  skillIds?: SkillId[];
};

/**
 * What a membership change needs to know about a component: its type, and the
 * id it is addressed by. Named on its own so a selection, a payload and a
 * candidate list can all be typed without dragging a row's presentation along.
 */
export type MovableComponent = Pick<ContextComponent, 'type' | 'key'>;

/**
 * One candidate package a selection can be moved into.
 *
 * The picked components are split in two rather than counted, because the two
 * halves are two different statements to the server: `missing` is what the add
 * call carries, and `held` is the part of the selection for which the move is a
 * plain detach from the source. A package that already holds everything picked
 * is the case worth naming: a component can sit in several packages at once, so
 * "moving" into such a package is not a no-op and not a duplicate either, and
 * the dialog says which of the two it is about to do rather than promising a
 * move and performing something else.
 */
export type MoveTarget = {
  pkg: PackageResponse;
  held: MovableComponent[];
  missing: MovableComponent[];
};

/** How many components this candidate is being asked about, held ones included. */
export function movedComponentCount(target: MoveTarget): number {
  return target.held.length + target.missing.length;
}

/** Nothing picked is new to this package, so the move is only a detach. */
export function holdsEverything(target: MoveTarget): boolean {
  return target.missing.length === 0;
}

/**
 * Turns the picked components into the payload the add and remove mutations
 * expect, grouped by type.
 *
 * `key` is the entity id for all three types, see the mappers in
 * `buildPackageContext`, which is what lets one function cover the three
 * without the caller having to know that a skill is linked by id and addressed
 * by slug. Grouping is what makes a mixed selection one call rather than one
 * call per component: a selection of two standards and a skill leaves the
 * source in a single request, so it cannot half-leave it.
 */
export function componentIdsPayload(
  components: readonly MovableComponent[],
): ComponentIdsPayload {
  const keysOf = (type: ContextComponent['type']) =>
    components.filter((component) => component.type === type).map((c) => c.key);

  const standardIds = keysOf('standard') as StandardId[];
  const commandIds = keysOf('command') as CommandId[];
  const skillIds = keysOf('skill') as SkillId[];

  return {
    ...(standardIds.length > 0 ? { standardIds } : {}),
    ...(commandIds.length > 0 ? { commandIds } : {}),
    ...(skillIds.length > 0 ? { skillIds } : {}),
  };
}

/** Whether a package carries this component, read off the ids it already has. */
export function packageHoldsComponent(
  pkg: PackageComponentIds,
  component: MovableComponent,
): boolean {
  const ids: readonly string[] =
    component.type === 'standard'
      ? (pkg.standards ?? [])
      : component.type === 'command'
        ? (pkg.commands ?? [])
        : (pkg.skills ?? []);
  return ids.includes(component.key);
}

/**
 * Where a selection can go, given the packages of its space and the one it is
 * being read from.
 *
 * Built from the space's package list rather than from a query of its own: that
 * list is already loaded by the Context surface, with the membership ids in it,
 * so the whole decision is local. Asking the server which packages hold a
 * component would also mean the dialog could disagree with the rail behind it.
 *
 * Alphabetical, the order of the rail. Hoisting the packages that do not hold
 * the components yet would put the list in a different order than the one the
 * user just read it in, to save a glance at a label that is on the row anyway.
 */
export function buildMoveTargets(
  packages: readonly PackageResponse[],
  components: readonly MovableComponent[],
  sourcePackageId: PackageId,
): MoveTarget[] {
  return packages
    .filter((pkg) => pkg.id !== sourcePackageId)
    .map((pkg) => ({
      pkg,
      held: components.filter((component) =>
        packageHoldsComponent(pkg, component),
      ),
      missing: components.filter(
        (component) => !packageHoldsComponent(pkg, component),
      ),
    }))
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
}

/**
 * The candidates a query keeps. Name and description, the two fields the rail
 * searches, so a package found from the rail is findable here under the same
 * words.
 */
export function filterMoveTargets(
  targets: readonly MoveTarget[],
  query: string,
): MoveTarget[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...targets];
  return targets.filter(
    (target) =>
      target.pkg.name.toLowerCase().includes(needle) ||
      (target.pkg.description ?? '').toLowerCase().includes(needle),
  );
}
