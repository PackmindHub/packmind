import { useCallback } from 'react';
import { useParams } from 'react-router';
import type {
  ApplyCreationChangeProposalsResponse,
  ChangeProposalDecision,
  CreationProposalOverview,
} from '@packmind/types';
import {
  ChangeProposalId,
  ChangeProposalStatus,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import {
  useApplyCreationChangeProposalsMutation,
  useGetGroupedChangeProposalsQuery,
} from '../api/queries/ChangeProposalsQueries';
import { useCreationProposalCache } from './useCreationProposalCache';

interface UseCreationReviewDetailOptions<T extends CreationProposalOverview> {
  proposalId: ChangeProposalId;
  orgSlugProp?: string;
  spaceSlugProp?: string;
  filter: (proposal: CreationProposalOverview) => proposal is T;
  getAcceptUrl: (
    response: ApplyCreationChangeProposalsResponse,
    orgSlug: string,
    spaceSlug: string,
  ) => string;
}

export function useCreationReviewDetail<T extends CreationProposalOverview>({
  proposalId,
  orgSlugProp,
  spaceSlugProp,
  filter,
  getAcceptUrl,
}: UseCreationReviewDetailOptions<T>) {
  const { organization } = useAuthContext();
  const { spaceId, space } = useCurrentSpace();
  const { orgSlug: orgSlugParam } = useParams<{ orgSlug: string }>();

  const orgSlug = orgSlugProp ?? orgSlugParam;
  const spaceSlug = spaceSlugProp ?? space?.slug;

  const { data: groupedProposals, isLoading } =
    useGetGroupedChangeProposalsQuery();

  const applyMutation = useApplyCreationChangeProposalsMutation({
    orgSlug,
    spaceSlug,
  });

  const proposal = groupedProposals?.creations.find(
    (c): c is T => c.id === proposalId && filter(c),
  );

  const { displayedProposal, submittedState, setSubmittedState } =
    useCreationProposalCache<T>(proposal);

  const handleAccept = useCallback(
    async (decision: ChangeProposalDecision<T['type']>) => {
      if (
        !organization?.id ||
        !spaceId ||
        !orgSlug ||
        !spaceSlug ||
        !displayedProposal
      )
        return;
      try {
        const response = await applyMutation.mutateAsync({
          organizationId: organization.id as OrganizationId,
          spaceId: spaceId as SpaceId,
          accepted: [
            {
              ...displayedProposal,
              status: ChangeProposalStatus.applied,
              decision,
            },
          ],
          rejected: [],
        });
        setSubmittedState({
          type: 'accepted',
          artefactUrl: getAcceptUrl(response, orgSlug, spaceSlug),
        });
      } catch {
        // error handled by mutation onError callback
      }
    },
    [
      organization?.id,
      spaceId,
      proposalId,
      orgSlug,
      spaceSlug,
      applyMutation,
      setSubmittedState,
      getAcceptUrl,
    ],
  );

  const handleReject = useCallback(async () => {
    if (!organization?.id || !spaceId) return;
    try {
      await applyMutation.mutateAsync({
        organizationId: organization.id as OrganizationId,
        spaceId: spaceId as SpaceId,
        accepted: [],
        rejected: [proposalId as ChangeProposalId],
      });
      setSubmittedState({ type: 'rejected' });
    } catch {
      // error handled by mutation onError callback
    }
  }, [organization?.id, spaceId, proposalId, applyMutation, setSubmittedState]);

  return {
    displayedProposal,
    submittedState,
    handleAccept,
    handleReject,
    isPending: applyMutation.isPending,
    isLoading,
  };
}
