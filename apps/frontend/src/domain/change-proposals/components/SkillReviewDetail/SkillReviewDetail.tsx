import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMSpinner } from '@packmind/ui';
import { OrganizationId, SkillId, SpaceId } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetSkillWithFilesByIdQuery } from '../../../skills/api/queries/SkillsQueries';
import {
  useApplySkillChangeProposalsMutation,
  useListChangeProposalsBySkillQuery,
} from '../../api/queries/ChangeProposalsQueries';
import { useUserLookup } from '../../hooks/useUserLookup';
import { useChangeProposalPool } from '../../hooks/useChangeProposalPool';
import { getSkillByIdKey } from '../../../skills/api/queryKeys';
import { ReviewDetailLayout } from '../ReviewDetailLayout';
import { SkillProposalReviewPanel } from './SkillProposalReviewPanel';
import { useBlocker, useBeforeUnload } from 'react-router';

interface SkillReviewDetailProps {
  artefactId: string;
}

export function SkillReviewDetail({
  artefactId,
}: Readonly<SkillReviewDetailProps>) {
  const skillId = artefactId as SkillId;
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const applySkillChangeProposalsMutation =
    useApplySkillChangeProposalsMutation();
  const { data: selectedSkillProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsBySkillQuery(skillId);

  const selectedSkillProposals =
    selectedSkillProposalsData?.changeProposals ?? [];

  const { data: selectedSkillData } = useGetSkillWithFilesByIdQuery(skillId);
  const selectedSkill = selectedSkillData ?? undefined;

  const pool = useChangeProposalPool(selectedSkillProposals);

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
      await applySkillChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: skillId,
        accepted: Array.from(pool.acceptedProposalIds),
        rejected: Array.from(pool.rejectedProposalIds),
      });

      await queryClient.invalidateQueries({
        queryKey: getSkillByIdKey(spaceId, skillId),
      });

      pool.resetPool();
    } catch {
      // Errors are handled by the mutation onError callbacks
    }
  }, [
    organizationId,
    spaceId,
    pool.acceptedProposalIds,
    pool.rejectedProposalIds,
    pool.hasPooledDecisions,
    applySkillChangeProposalsMutation,
    queryClient,
    pool.resetPool,
  ]);

  return (
    <>
      <ReviewDetailLayout
        proposals={selectedSkillProposals}
        reviewingProposalId={pool.reviewingProposalId}
        acceptedProposalIds={pool.acceptedProposalIds}
        rejectedProposalIds={pool.rejectedProposalIds}
        blockedByConflictIds={pool.blockedByConflictIds}
        hasPooledDecisions={pool.hasPooledDecisions}
        currentArtefactVersion={selectedSkill?.skill?.version}
        userLookup={userLookup}
        onSelectProposal={pool.handleSelectProposal}
        onPoolAccept={pool.handlePoolAccept}
        onPoolReject={pool.handlePoolReject}
        onUndoPool={pool.handleUndoPool}
        onSave={handleSave}
        isSaving={applySkillChangeProposalsMutation.isPending}
      >
        {isLoadingProposals ? (
          <PMSpinner />
        ) : (
          <SkillProposalReviewPanel
            selectedSkill={selectedSkill}
            selectedSkillProposals={selectedSkillProposals}
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
