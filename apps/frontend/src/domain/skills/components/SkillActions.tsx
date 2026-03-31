import { PMAlertDialog, PMButton, PMHStack, PMBadge } from '@packmind/ui';
import { useNavigate } from 'react-router';
import { OrganizationId, SkillId, SpaceId } from '@packmind/types';
import { routes } from '../../../shared/utils/routes';
import { DownloadSkillPopover } from './DownloadSkillPopover';

type SkillActionsProps = {
  onDeleteRequest: () => void;
  onDeleteDialogChange: (isOpen: boolean) => void;
  onConfirmDelete: () => void;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  deleteDialogMessage: string;
  pendingCount: number;
  skillId: SkillId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
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
  organizationId,
  spaceId,
  orgSlug,
  spaceSlug,
}: SkillActionsProps) => {
  const navigate = useNavigate();

  return (
    <PMHStack gap={2}>
      <DownloadSkillPopover
        skillId={skillId}
        organizationId={organizationId}
        spaceId={spaceId}
      />
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
