import { useCallback } from 'react';
import type {
  CommandId,
  OrganizationId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { useDeleteCommandMutation } from '../../../commands/api/queries/CommandsQueries';
import { useDeleteSkillMutation } from '../../../skills/api/queries/SkillsQueries';
import { useDeleteStandardMutation } from '../../../standards/api/queries/StandardsQueries';
import type { ContextComponent } from './buildPackageContext';

/**
 * Deletes the component the pane is showing, whichever of the three types it
 * is.
 *
 * The three types are deleted by three mutations with three different
 * signatures, which is a fact about how the domains grew and not something the
 * pane should have to know. It calls all three hooks and picks one, because a
 * hook cannot be called conditionally: the two that are not used cost a
 * subscription and nothing else.
 *
 * Deliberately the same mutations the components' own pages use, rather than
 * the batch ones. They already invalidate the space's package list, which is
 * what the rail and this pane are built from, so the screen behind the dialog
 * repairs itself with no extra work here. Reaching for the batch endpoints
 * would be a second way of deleting one component that could start behaving
 * differently from the first.
 */
export function useDeleteContextComponent({
  spaceId,
  organizationId,
}: Readonly<{ spaceId: SpaceId; organizationId: OrganizationId }>) {
  const deleteStandard = useDeleteStandardMutation();
  const deleteCommand = useDeleteCommandMutation();
  const deleteSkill = useDeleteSkillMutation();

  const deleteComponent = useCallback(
    async (
      component: Pick<ContextComponent, 'type' | 'key'>,
    ): Promise<void> => {
      switch (component.type) {
        case 'standard':
          await deleteStandard.mutateAsync(component.key as StandardId);
          return;
        case 'command':
          await deleteCommand.mutateAsync({
            organizationId,
            spaceId,
            recipeId: component.key as CommandId,
          });
          return;
        case 'skill':
          await deleteSkill.mutateAsync(component.key as SkillId);
          return;
      }
    },
    [deleteStandard, deleteCommand, deleteSkill, organizationId, spaceId],
  );

  return {
    deleteComponent,
    isDeleting:
      deleteStandard.isPending ||
      deleteCommand.isPending ||
      deleteSkill.isPending,
  };
}
