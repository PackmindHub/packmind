import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMSpinner } from '@packmind/ui';
import { OrganizationId, StandardId, SpaceId } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  useGetStandardByIdQuery,
  useGetRulesByStandardIdQuery,
} from '../../../standards/api/queries/StandardsQueries';
import {
  useApplyStandardChangeProposalsMutation,
  useListChangeProposalsByStandardQuery,
} from '../../api/queries/ChangeProposalsQueries';
import {
  GET_CHANGE_PROPOSALS_BY_STANDARD_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../../api/queryKeys';
import { useUserLookup } from '../../hooks/useUserLookup';
import { useChangeProposalPool } from '../../hooks/useChangeProposalPool';
import { getStandardByIdKey } from '../../../standards/api/queryKeys';
import { ReviewDetailLayout } from '../ReviewDetailLayout';
import { ProposalReviewPanel } from './ProposalReviewPanel';
import { useBlocker, useBeforeUnload } from 'react-router';

interface StandardReviewDetailProps {
  artefactId: string;
}

export function StandardReviewDetail({
  artefactId,
}: Readonly<StandardReviewDetailProps>) {
  const standardId = artefactId as StandardId;
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const applyStandardChangeProposalsMutation =
    useApplyStandardChangeProposalsMutation();
  const { data: selectedStandardProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsByStandardQuery(standardId);

  const selectedStandardProposals =
    selectedStandardProposalsData?.changeProposals ?? [];

  const { data: selectedStandardData } = useGetStandardByIdQuery(standardId);
  const selectedStandard = selectedStandardData?.standard ?? undefined;

  const { data: rulesData, isLoading: isLoadingRules } =
    useGetRulesByStandardIdQuery(
      organizationId as OrganizationId,
      spaceId as SpaceId,
      standardId,
    );
  const rules = rulesData ?? [];

  const pool = useChangeProposalPool(selectedStandardProposals);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (pool.hasPooledDecisions) {
          event.preventDefault();
        }
      },
      [pool.hasPooledDecisions],
    ),
  );

  const blocker = useBlocker(pool.hasPooledDecisions);

  const handleSave = useCallback(async () => {
    if (!organizationId || !spaceId) return;
    if (!pool.hasPooledDecisions) return;

    try {
      await applyStandardChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: standardId,
        accepted: Array.from(pool.acceptedProposalIds),
        rejected: Array.from(pool.rejectedProposalIds),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_CHANGE_PROPOSALS_BY_STANDARD_KEY, standardId],
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(spaceId, standardId),
        }),
      ]);

      pool.resetPool();
    } catch {
      // Errors are handled by the mutation onError callbacks
    }
  }, [
    organizationId,
    spaceId,
    pool,
    applyStandardChangeProposalsMutation,
    queryClient,
    standardId,
  ]);

  return (
    <>
      <ReviewDetailLayout
        proposals={selectedStandardProposals}
        reviewingProposalId={pool.reviewingProposalId}
        acceptedProposalIds={pool.acceptedProposalIds}
        rejectedProposalIds={pool.rejectedProposalIds}
        blockedByConflictIds={pool.blockedByConflictIds}
        hasPooledDecisions={pool.hasPooledDecisions}
        currentArtefactVersion={selectedStandard?.version}
        userLookup={userLookup}
        onSelectProposal={pool.handleSelectProposal}
        onPoolAccept={pool.handlePoolAccept}
        onPoolReject={pool.handlePoolReject}
        onUndoPool={pool.handleUndoPool}
        onSave={handleSave}
        isSaving={applyStandardChangeProposalsMutation.isPending}
      >
        {isLoadingProposals || isLoadingRules ? (
          <PMSpinner />
        ) : (
          <ProposalReviewPanel
            selectedStandard={selectedStandard}
            selectedStandardProposals={selectedStandardProposals}
            rules={rules}
            reviewingProposalId={pool.reviewingProposalId}
            acceptedProposalIds={pool.acceptedProposalIds}
            rejectedProposalIds={pool.rejectedProposalIds}
            blockedByConflictIds={pool.blockedByConflictIds}
            userLookup={userLookup}
            onSelectProposal={pool.handleSelectProposal}
            onPoolAccept={pool.handlePoolAccept}
            onPoolReject={pool.handlePoolReject}
            onUndoPool={pool.handleUndoPool}
          />
        )}
      </ReviewDetailLayout>
      <PMAlertDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(details) => {
          if (!details.open) {
            blocker.reset?.();
          }
        }}
        title="Unsaved changes"
        message="You have unsaved changes. If you leave this page, your changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        confirmColorScheme="red"
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}
