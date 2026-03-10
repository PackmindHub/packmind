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
import { SkillId } from '@packmind/types';
import { routes } from '../../../shared/utils/routes';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

type SkillActionsProps = {
  onDeleteRequest: () => void;
  onDeleteDialogChange: (isOpen: boolean) => void;
  onConfirmDelete: () => void;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  deleteDialogMessage: string;
  pendingCount: number;
  skillId: SkillId;
  orgSlug?: string;
  spaceSlug?: string;
};

export const SkillActions = ({
  onDeleteRequest,
  onDeleteDialogChange,
  onConfirmDelete,
  isDeleteDialogOpen,
  isDeleting,
  deleteDialogMessage,
  pendingCount,
  skillId,
  orgSlug,
  spaceSlug,
}: SkillActionsProps) => {
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
                  'skills',
                  skillId,
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
        title="Delete Skill"
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
