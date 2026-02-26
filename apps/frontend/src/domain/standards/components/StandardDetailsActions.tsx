import {
  PMAlertDialog,
  PMButton,
  PMHStack,
  PMFeatureFlag,
  PMBadge,
  DEFAULT_FEATURE_DOMAIN_MAP,
  CHANGE_PROPOSALS_FEATURE_KEY,
} from '@packmind/ui';
import { useNavigate } from 'react-router';
import { routes } from '../../../shared/utils/routes';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { StandardId } from '@packmind/types';

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
  orgSlug,
  spaceSlug,
}: SummaryActionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  return (
    <PMHStack gap={2}>
      <PMFeatureFlag
        featureKeys={[CHANGE_PROPOSALS_FEATURE_KEY]}
        featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
        userEmail={user?.email}
      >
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
      </PMFeatureFlag>
      <PMButton variant="primary" onClick={onEdit}>
        Edit
      </PMButton>
      <PMAlertDialog
        trigger={
          <PMButton
            variant="tertiary"
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
