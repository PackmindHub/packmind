import { useState } from 'react';
import {
  PMButton,
  PMHStack,
  PMIcon,
  PMConfirmationModal,
  PMBadge,
  PMTooltip,
} from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { LuCheck, LuCircleAlert, LuCircleX } from 'react-icons/lu';
import {
  useApplyChangeProposalMutation,
  useRejectChangeProposalMutation,
} from '../api/queries/ChangeProposalsQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';

interface ChangeProposalActionButtonsProps {
  proposalId: ChangeProposalId;
  recipeId: RecipeId;
  outdated: boolean;
}

export function ChangeProposalActionButtons({
  proposalId,
  recipeId,
  outdated,
}: Readonly<ChangeProposalActionButtonsProps>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const applyMutation = useApplyChangeProposalMutation();
  const rejectMutation = useRejectChangeProposalMutation();
  const [showForceApplyDialog, setShowForceApplyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleApply = () => {
    if (!organization?.id || !spaceId) return;

    applyMutation.mutate(
      {
        organizationId: organization.id as OrganizationId,
        spaceId: spaceId as SpaceId,
        changeProposalId: proposalId,
        recipeId,
        force: false,
      },
      {
        onError: (error) => {
          if (isPackmindConflictError(error)) {
            setShowForceApplyDialog(true);
          }
        },
      },
    );
  };

  const handleForceApply = () => {
    if (!organization?.id || !spaceId) return;

    applyMutation.mutate(
      {
        organizationId: organization.id as OrganizationId,
        spaceId: spaceId as SpaceId,
        changeProposalId: proposalId,
        recipeId,
        force: true,
      },
      {
        onSuccess: () => {
          setShowForceApplyDialog(false);
        },
      },
    );
  };

  const handleReject = () => {
    if (!organization?.id || !spaceId) return;

    rejectMutation.mutate(
      {
        organizationId: organization.id as OrganizationId,
        spaceId: spaceId as SpaceId,
        changeProposalId: proposalId,
        recipeId,
      },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
        },
      },
    );
  };

  return (
    <PMHStack gap={2}>
      {outdated && (
        <PMTooltip label="This proposal was made on an outdated version">
          <PMBadge colorPalette="orange" variant="subtle" size="sm">
            <PMIcon>
              <LuCircleAlert />
            </PMIcon>
            Outdated
          </PMBadge>
        </PMTooltip>
      )}
      <PMButton
        size="xs"
        onClick={handleApply}
        disabled={applyMutation.isPending}
      >
        <PMIcon>
          <LuCheck />
        </PMIcon>
      </PMButton>
      <PMConfirmationModal
        trigger={
          <PMButton
            variant="secondary"
            size="xs"
            disabled={rejectMutation.isPending}
          >
            <PMIcon>
              <LuCircleX />
            </PMIcon>
          </PMButton>
        }
        open={showRejectDialog}
        onOpenChange={(details) => setShowRejectDialog(details.open)}
        title="Reject change proposal"
        message="Are you sure you want to reject this change proposal? This action cannot be undone."
        confirmText="Reject"
        onConfirm={handleReject}
        isLoading={rejectMutation.isPending}
      />
      <PMConfirmationModal
        trigger={<></>}
        open={showForceApplyDialog}
        onOpenChange={(details) => setShowForceApplyDialog(details.open)}
        title="Outdated proposal"
        message="This proposal was made on an outdated version. Applying it will overwrite the current value with the proposed value. Do you want to force apply?"
        confirmText="Force apply"
        onConfirm={handleForceApply}
        isLoading={applyMutation.isPending}
      />
    </PMHStack>
  );
}
