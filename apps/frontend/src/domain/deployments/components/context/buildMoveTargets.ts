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
 * The ids a component is addressed by when a package's membership is changed.
 * One key is set, the other two are absent — the two mutations take a bag of
 * per-type arrays, and sending an empty array for the types that are not
 * concerned would be a different statement than not sending them.
 */
export type ComponentIdsPayload = {
  standardIds?: StandardId[];
  commandIds?: CommandId[];
  skillIds?: SkillId[];
};

/**
 * One candidate package a component can be moved into.
 *
 * `alreadyHolds` is the case worth naming. A component can sit in several
 * packages at once, so a "move" into a package that already carries it is not a
 * no-op and not a duplicate either: it is a plain detach from the source. The
 * decision is made here so the dialog can say which of the two it is about to
 * do rather than promising a move and performing something else.
 */
export type MoveTarget = {
  pkg: PackageResponse;
  alreadyHolds: boolean;
};

/**
 * Turns a component into the payload the add and remove mutations expect.
 *
 * `key` is the entity id for all three types — see the mappers in
 * `buildPackageContext` — which is what lets one function cover the three
 * without the caller having to know that a skill is linked by id and addressed
 * by slug.
 */
export function componentIdsPayload(
  component: Pick<ContextComponent, 'type' | 'key'>,
): ComponentIdsPayload {
  switch (component.type) {
    case 'standard':
      return { standardIds: [component.key as StandardId] };
    case 'command':
      return { commandIds: [component.key as CommandId] };
    case 'skill':
      return { skillIds: [component.key as SkillId] };
  }
}

/** Whether a package carries this component, read off the ids it already has. */
export function packageHoldsComponent(
  pkg: PackageComponentIds,
  component: Pick<ContextComponent, 'type' | 'key'>,
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
 * Where a component can go, given the packages of its space and the one it is
 * being read from.
 *
 * Built from the space's package list rather than from a query of its own: that
 * list is already loaded by the Context surface, with the membership ids in it,
 * so the whole decision is local. Asking the server which packages hold a
 * component would also mean the dialog could disagree with the rail behind it.
 *
 * Alphabetical, the order of the rail. Hoisting the packages that do not hold
 * the component yet would put the list in a different order than the one the
 * user just read it in, to save a glance at a label that is on the row anyway.
 */
export function buildMoveTargets(
  packages: readonly PackageResponse[],
  component: Pick<ContextComponent, 'type' | 'key'>,
  sourcePackageId: PackageId,
): MoveTarget[] {
  return packages
    .filter((pkg) => pkg.id !== sourcePackageId)
    .map((pkg) => ({
      pkg,
      alreadyHolds: packageHoldsComponent(pkg, component),
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
