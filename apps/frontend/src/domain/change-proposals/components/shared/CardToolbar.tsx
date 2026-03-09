import { PMButton, PMHStack } from '@packmind/ui';
import { ChangeProposalType, PackageId, SpaceId } from '@packmind/types';
import { LuArrowUpRight, LuMinimize2 } from 'react-icons/lu';
import { ViewMode } from '../../hooks/useCardReviewState';
import { CardActions } from './CardActions';
import { ViewModeSelector } from './ViewModeSelector';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface CardToolbarProps {
  poolStatus: PoolStatus;
  proposalType: ChangeProposalType;
  packageIds: PackageId[];
  spaceId: SpaceId;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  viewMode: ViewMode;
  showEditButton?: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onEdit: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
}

export function CardToolbar({
  poolStatus,
  proposalType,
  packageIds,
  spaceId,
  isOutdated,
  isBlockedByConflict,
  viewMode,
  showEditButton,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
}: Readonly<CardToolbarProps>) {
  const isFocused = viewMode === 'focused';
  const isExpanded = !isFocused;

  return (
    <PMHStack justifyContent="space-between" alignItems="center">
      <PMHStack gap={2} alignItems="center">
        <PMButton
          size="sm"
          variant={'secondary'}
          onClick={() => onViewModeChange(isFocused ? 'diff' : 'focused')}
        >
          {isFocused ? <LuArrowUpRight /> : <LuMinimize2 />}
          {isFocused ? 'Show in file' : 'Focused'}
        </PMButton>
        {isExpanded && (
          <ViewModeSelector
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        )}
      </PMHStack>
      <CardActions
        poolStatus={poolStatus}
        proposalType={proposalType}
        packageIds={packageIds}
        spaceId={spaceId}
        isOutdated={isOutdated}
        isBlockedByConflict={isBlockedByConflict}
        showEditButton={showEditButton}
        onEdit={onEdit}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onUndo={onUndo}
      />
    </PMHStack>
  );
}
