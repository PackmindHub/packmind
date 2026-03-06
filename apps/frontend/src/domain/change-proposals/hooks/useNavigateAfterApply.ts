import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ListChangeProposalsBySpaceResponse } from '@packmind/types';
import { GET_GROUPED_CHANGE_PROPOSALS_KEY } from '../api/queryKeys';
import { routes } from '../../../shared/utils/routes';

export function useNavigateAfterApply(currentArtefactId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  return useCallback(() => {
    if (!orgSlug || !spaceSlug) return;

    const groupedProposals =
      queryClient.getQueryData<ListChangeProposalsBySpaceResponse>(
        GET_GROUPED_CHANGE_PROPOSALS_KEY,
      );
    if (!groupedProposals) return;

    const allItems = [
      ...groupedProposals.commands.map((item) => ({
        ...item,
        artefactType: 'commands' as const,
      })),
      ...groupedProposals.standards.map((item) => ({
        ...item,
        artefactType: 'standards' as const,
      })),
      ...groupedProposals.skills.map((item) => ({
        ...item,
        artefactType: 'skills' as const,
      })),
    ].sort((a, b) => b.lastContributedAt.localeCompare(a.lastContributedAt));

    const currentStillExists = allItems.some(
      (item) => item.artefactId === currentArtefactId,
    );

    if (currentStillExists) return;

    if (allItems.length > 0) {
      const first = allItems[0];
      navigate(
        routes.space.toReviewChangesArtefact(
          orgSlug,
          spaceSlug,
          first.artefactType,
          first.artefactId,
        ),
      );
      return;
    }

    const creations = groupedProposals.creations ?? [];
    if (creations.length > 0) {
      const sorted = [...creations].sort((a, b) =>
        b.lastContributedAt.localeCompare(a.lastContributedAt),
      );
      const first = sorted[0];
      navigate(
        routes.space.toReviewChangesCreation(
          orgSlug,
          spaceSlug,
          first.artefactType,
          first.id,
        ),
      );
    }
  }, [queryClient, navigate, orgSlug, spaceSlug, currentArtefactId]);
}
