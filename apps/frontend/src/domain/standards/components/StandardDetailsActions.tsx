import { PMAlertDialog, PMButton, PMHStack, PMBadge } from '@packmind/ui';
import { useNavigate } from 'react-router';
import { routes } from '../../../shared/utils/routes';
import { OrganizationId, SpaceId, StandardId } from '@packmind/types';
import { AddToPackagesButton } from '../../deployments/components/AddToPackagesDialog';

type SummaryActionsProps = {
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteDialogChange: (isOpen: boolean) => void;
  onConfirmDelete: () => void;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  deleteDialogMessage: string;
  pendingCount: number;
  standardId: StandardId;
  organizationId?: OrganizationId;
  spaceId?: SpaceId;
  orgSlug?: string;
  spaceSlug?: string;
};

export const SummaryActions = ({
  onEdit,
  onDeleteRequest,
  onDeleteDialogChange,
  onConfirmDelete,
  isDeleteDialogOpen,
  isDeleting,
  deleteDialogMessage,
  pendingCount,
  standardId,
  organizationId,
  spaceId,
  orgSlug,
  spaceSlug,
}: SummaryActionsProps) => {
  const navigate = useNavigate();

  return (
    <PMHStack gap={2}>
      {pendingCount > 0 && (
        <PMButton
          variant="tertiary"
          onClick={() =>
            navigate(
              routes.space.toReviewChangesArtefact(
                orgSlug || '',
                spaceSlug || '',
                'standards',
                standardId,
              ),
            )
          }
        >
          <PMHStack gap={2}>
            Changes to review
            <PMBadge>{pendingCount}</PMBadge>
          </PMHStack>
        </PMButton>
      )}
      <PMButton variant="primary" onClick={onEdit}>
        Edit
      </PMButton>
      {organizationId && spaceId ? (
        <AddToPackagesButton
          artifactId={standardId}
          artifactType="standard"
          artifactKindLabel="standard"
          organizationId={organizationId}
          spaceId={spaceId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      ) : null}
      <PMAlertDialog
        trigger={
          <PMButton
            variant="secondary"
            loading={isDeleting}
            onClick={onDeleteRequest}
          >
            Delete
          </PMButton>
        }
        title="Delete Standard"
        message={deleteDialogMessage}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColorScheme="red"
        onConfirm={onConfirmDelete}
        open={isDeleteDialogOpen}
        onOpenChange={({ open }) => onDeleteDialogChange(open)}
        isLoading={isDeleting}
      />
    </PMHStack>
  );
};

type RuleActionsProps = {
  onBackToSummary: () => void;
};

export const RuleActions = ({ onBackToSummary }: RuleActionsProps) => (
  <PMHStack gap={2}>
    <PMButton variant="tertiary" onClick={onBackToSummary}>
      Back to summary
    </PMButton>
  </PMHStack>
);
