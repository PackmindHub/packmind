import { useCallback, useMemo, useState } from 'react';
import { PMAlertDialog, PMSpinner } from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  SkillId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetSkillWithFilesByIdQuery } from '../../../skills/api/queries/SkillsQueries';
import {
  useApplySkillChangeProposalsMutation,
  useListChangeProposalsBySkillQuery,
} from '../../api/queries/ChangeProposalsQueries';
import { useUserLookup } from '../../hooks/useUserLookup';
import { useChangeProposalPool } from '../../hooks/useChangeProposalPool';
import { computeSkillOutdatedIds } from '../../utils/computeOutdatedProposalIds';
import { ReviewDetailLayout } from '../ReviewDetailLayout';
import { SkillProposalReviewPanel } from './SkillProposalReviewPanel';
import { useBlocker, useBeforeUnload } from 'react-router';

interface SkillReviewDetailProps {
  artefactId: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export function SkillReviewDetail({
  artefactId,
  orgSlug,
  spaceSlug,
}: Readonly<SkillReviewDetailProps>) {
  const skillId = artefactId as SkillId;
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const { data: selectedSkillProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsBySkillQuery(skillId);

  const selectedSkillProposals =
    selectedSkillProposalsData?.changeProposals ?? [];

  const { data: selectedSkillData } = useGetSkillWithFilesByIdQuery(skillId);
  const selectedSkill = selectedSkillData ?? undefined;
  const skillSlug = selectedSkill?.skill?.slug;

  const applySkillChangeProposalsMutation =
    useApplySkillChangeProposalsMutation({ orgSlug, spaceSlug, skillSlug });

  const pool = useChangeProposalPool(selectedSkillProposals);

  const [showUnifiedView, setShowUnifiedView] = useState(false);

  const handleUnifiedViewChange = useCallback(
    (checked: boolean) => {
      setShowUnifiedView(checked);
      if (checked && pool.reviewingProposalId) {
        // When toggling unified view ON, clear the selected proposal
        pool.handleSelectProposal(pool.reviewingProposalId);
      }
    },
    [pool],
  );

  const handleSelectProposal = useCallback(
    (proposalId: ChangeProposalId) => {
      // When selecting a proposal, turn off unified view
      if (showUnifiedView) {
        setShowUnifiedView(false);
      }
      pool.handleSelectProposal(proposalId);
    },
    [pool, showUnifiedView],
  );

  const outdatedProposalIds = useMemo(
    () =>
      computeSkillOutdatedIds(
        selectedSkillProposals,
        selectedSkill?.skill,
        selectedSkill?.files ?? [],
      ),
    [selectedSkillProposals, selectedSkill],
  );

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
        outdatedProposalIds={outdatedProposalIds}
        userLookup={userLookup}
        showUnifiedView={showUnifiedView}
        onSelectProposal={handleSelectProposal}
        onPoolAccept={pool.handlePoolAccept}
        onPoolReject={pool.handlePoolReject}
        onUndoPool={pool.handleUndoPool}
        onUnifiedViewChange={handleUnifiedViewChange}
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
            outdatedProposalIds={outdatedProposalIds}
            acceptedProposalIds={pool.acceptedProposalIds}
            rejectedProposalIds={pool.rejectedProposalIds}
            blockedByConflictIds={pool.blockedByConflictIds}
            userLookup={userLookup}
            showUnifiedView={showUnifiedView}
            onSelectProposal={handleSelectProposal}
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
