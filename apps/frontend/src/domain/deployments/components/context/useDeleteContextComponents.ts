import { useCallback } from 'react';
import type {
  CommandId,
  OrganizationId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { useDeleteCommandsBatchMutation } from '../../../commands/api/queries/CommandsQueries';
import { useDeleteSkillsBatchMutation } from '../../../skills/api/queries/SkillsQueries';
import { useDeleteStandardsBatchMutation } from '../../../standards/api/queries/StandardsQueries';
import type { MovableComponent } from './buildMoveTargets';

/**
 * What became of a deletion, told per component rather than as a yes or no.
 *
 * A mixed selection is three requests, so "it failed" is not a question with
 * one answer: the standards can leave the space while the commands are refused.
 * Naming both halves is what lets the caller say something true in its toast,
 * and un-tick only the rows that are actually gone.
 *
 * Generic over what it was handed, so a caller that picked full components gets
 * full components back: the sentence it writes needs their names, and this file
 * only needs their types and ids.
 */
export type DeleteComponentsOutcome<T> = {
  deleted: T[];
  failed: T[];
};

/**
 * Deletes a selection of components, whichever of the three types it mixes.
 *
 * The three types are deleted by three mutations with three different
 * signatures, which is a fact about how the domains grew and not something a
 * pane should have to know. All three hooks are called and only the needed ones
 * are used, because a hook cannot be called conditionally: the ones the
 * selection does not reach cost a subscription and nothing else.
 *
 * The batch endpoints, with one id in them when the selection holds one, which
 * is what `deleteThisPackage` already does with the package batch: a second,
 * single-component path would be a second way of deleting a component that
 * could start behaving differently from the first. They invalidate the space's
 * package list themselves, so the rail and the pane behind the dialog repair
 * themselves with no extra work here.
 *
 * One request per type rather than per component: a selection of forty
 * standards leaves the space in a single call, so it cannot half-leave it. The
 * three run together, since they are three unrelated resources and nothing is
 * learnt by waiting for one before asking the next.
 */
export function useDeleteContextComponents({
  spaceId,
  organizationId,
}: Readonly<{ spaceId: SpaceId; organizationId: OrganizationId }>) {
  const deleteStandards = useDeleteStandardsBatchMutation();
  const deleteCommands = useDeleteCommandsBatchMutation();
  const deleteSkills = useDeleteSkillsBatchMutation();

  const deleteComponents = useCallback(
    async <T extends MovableComponent>(
      components: readonly T[],
    ): Promise<DeleteComponentsOutcome<T>> => {
      const ofType = (type: MovableComponent['type']) =>
        components.filter((component) => component.type === type);

      /*
       * A type nothing was picked of is dropped rather than sent an empty list,
       * the rule `componentIdsPayload` already states for the membership calls:
       * an empty array is a different statement than no array, and here it
       * would be a request asking to delete nothing.
       */
      const batches = [
        {
          picked: ofType('standard'),
          run: (picked: readonly T[]) =>
            deleteStandards.mutateAsync(
              picked.map((component) => component.key as StandardId),
            ),
        },
        {
          picked: ofType('command'),
          run: (picked: readonly T[]) =>
            deleteCommands.mutateAsync({
              organizationId,
              spaceId,
              commandIds: picked.map((component) => component.key as CommandId),
            }),
        },
        {
          picked: ofType('skill'),
          run: (picked: readonly T[]) =>
            deleteSkills.mutateAsync(
              picked.map((component) => component.key as SkillId),
            ),
        },
      ].filter((batch) => batch.picked.length > 0);

      /*
       * Settled rather than all: `Promise.all` rejects on the first failure and
       * abandons the other two answers, which is exactly the information the
       * outcome above exists to carry. The requests are already in flight by
       * then, so the components would leave the space with the caller believing
       * they had not.
       */
      const results = await Promise.allSettled(
        batches.map((batch) => batch.run(batch.picked)),
      );

      const deleted: T[] = [];
      const failed: T[] = [];
      results.forEach((result, index) => {
        const landing = result.status === 'fulfilled' ? deleted : failed;
        landing.push(...batches[index].picked);
      });

      return { deleted, failed };
    },
    [deleteStandards, deleteCommands, deleteSkills, organizationId, spaceId],
  );

  return {
    deleteComponents,
    isDeleting:
      deleteStandards.isPending ||
      deleteCommands.isPending ||
      deleteSkills.isPending,
  };
}
