import { ChangeProposalStatus } from '@packmind/types';
import {
  componentSelectionKey,
  type ContextComponentType,
} from './buildPackageContext';

/**
 * What the component header says about whether anyone is looking after this
 * component: when it last changed, and whether a change is waiting on someone.
 *
 * Pure, and beside `packageActivity` for the same reason that one is: the
 * header of a pane is the wrong place to work out what a payload means, and
 * both of these facts are one bad reading away from being untrue.
 */

/**
 * When the entity last changed, or nothing when it does not say.
 *
 * Nothing rather than a fallback. `CommandsList` renders
 * `recipe.updatedAt || new Date()`, which prints "0 seconds ago" for every
 * command the API sent no date for: a component nobody has touched in a year
 * reads as one edited while you watched. A header that says less is worth more
 * than one that invents a date, which is the rule `packageActivity` already
 * follows.
 *
 * Typed loosely because the three entities disagree in their types and agree in
 * their payloads: `Skill` declares `updatedAt`, `Standard` declares it
 * optional, and `Command` does not declare it at all even though its table is
 * `WithTimestamps` and its rows carry it. One reader for all three rather than
 * three casts at three call sites.
 */
export function componentUpdatedAt(
  entity: { updatedAt?: Date | string | null } | null | undefined,
): string | null {
  if (!entity?.updatedAt) return null;

  const updated = new Date(entity.updatedAt);
  if (Number.isNaN(updated.getTime())) return null;

  return updated.toISOString();
}

/** The proposals payload, as loosely as the three queries agree on it. */
type ChangeProposalsPayload =
  | { changeProposals?: { status: string }[] | null }
  | null
  | undefined;

/**
 * How many proposals are waiting on a decision.
 *
 * Only the pending ones. A component that has had fifty proposals accepted over
 * a year is a well maintained one, not one with fifty things to read, and the
 * header is answering "is anyone waiting on me".
 *
 * Zero when the payload is missing, which is also what the OSS edition's stub
 * returns: proposals are a proprietary capability, and the header must simply
 * not mention them there rather than showing a count that cannot arrive.
 */
export function pendingProposalCount(payload: ChangeProposalsPayload): number {
  return (
    payload?.changeProposals?.filter(
      (proposal) => proposal.status === ChangeProposalStatus.pending,
    ).length ?? 0
  );
}

/**
 * The space's whole answer, as loosely as the grouped query gives it.
 *
 * `creations` is deliberately absent. A proposal to create a component names no
 * artefact yet, so it cannot mark a row in a list of components that exist.
 */
type GroupedProposalsPayload =
  | {
      standards?: { artefactId: string; changeProposalCount: number }[] | null;
      commands?: { artefactId: string; changeProposalCount: number }[] | null;
      skills?: { artefactId: string; changeProposalCount: number }[] | null;
    }
  | null
  | undefined;

/**
 * How many proposals wait on each component of the space, keyed the way a row
 * is identified.
 *
 * Keyed by `componentSelectionKey` and not by the artefact id, for the reason
 * that function exists: two entities of different types can carry the same id,
 * and a lookup on the id alone would mark a standard because a command with the
 * same id has a proposal open.
 *
 * The counts are already the pending ones. `groupProposalsByArtefact` filters
 * on `ChangeProposalStatus.pending` before it groups, so this agrees with
 * `pendingProposalCount` above by construction rather than by coincidence: the
 * header of a component and its row in the list read one number two ways.
 *
 * An empty map when the payload is missing, which is what the OSS edition's
 * stub returns. A caller must show nothing there rather than a zero, the same
 * rule the header follows.
 */
export function pendingReviewsByComponent(
  grouped: GroupedProposalsPayload,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  if (!grouped) return counts;

  const groups = [
    { type: 'standard' as const, overviews: grouped.standards },
    { type: 'command' as const, overviews: grouped.commands },
    { type: 'skill' as const, overviews: grouped.skills },
  ];

  for (const { type, overviews } of groups) {
    for (const overview of overviews ?? []) {
      if (overview.changeProposalCount <= 0) continue;
      counts.set(
        componentSelectionKey({ type, key: overview.artefactId }),
        overview.changeProposalCount,
      );
    }
  }

  return counts;
}

/**
 * The count as a sentence, because it sits in a row of facts rather than on a
 * button. The pages spell it "Changes to review" beside a badge, which needs
 * the badge to mean anything; this one reads on its own.
 */
export function reviewChangesLabel(count: number): string {
  return count === 1 ? '1 change to review' : `${count} changes to review`;
}

/**
 * The segment the review surface addresses each type by. Its own record rather
 * than the plural labels the pane already has, because these are URL segments
 * that the review routes own: the day one of them is renamed, the label on
 * screen must not follow it, and vice versa.
 */
export const REVIEW_ARTEFACT_TYPES: Record<ContextComponentType, string> = {
  standard: 'standards',
  command: 'commands',
  skill: 'skills',
};
