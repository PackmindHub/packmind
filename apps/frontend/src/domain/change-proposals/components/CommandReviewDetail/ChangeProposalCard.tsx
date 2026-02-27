import { PMAccordion } from '@packmind/ui';
import { ChangeProposalId, ChangeProposalType, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCommandReviewState';
import { ChangeProposalCardHeader } from './ChangeProposalCardHeader';
import { ChangeProposalCardBody } from './ChangeProposalCardBody';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

const borderColorByStatus: Record<PoolStatus, string> = {
  pending: 'border.tertiary',
  accepted: 'green.300',
  dismissed: 'red.300',
};

interface ChangeProposalCardProps {
  proposal: ChangeProposalWithConflicts;
  proposalNumber: number;
  recipe: Recipe;
  poolStatus: PoolStatus;
  authorName: string;
  viewMode: ViewMode;
  isEditing: boolean;
  editedValue: string;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  isEditModified: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onEdit: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
  onEditedValueChange: (proposalId: ChangeProposalId, value: string) => void;
  onResetToOriginal: (proposalId: ChangeProposalId) => void;
  onCancelEdit: () => void;
  onSaveAndAccept: (proposalId: ChangeProposalId) => void;
}

export function ChangeProposalCard({
  proposal,
  proposalNumber,
  recipe,
  poolStatus,
  authorName,
  viewMode,
  isEditing,
  editedValue,
  isOutdated,
  isBlockedByConflict,
  isEditModified,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  onEditedValueChange,
  onResetToOriginal,
  onCancelEdit,
  onSaveAndAccept,
}: Readonly<ChangeProposalCardProps>) {
  return (
    <PMAccordion.Item
      value={proposal.id}
      border="1px solid"
      borderColor={borderColorByStatus[poolStatus]}
      borderRadius="md"
      width="full"
    >
      <ChangeProposalCardHeader
        proposalNumber={proposalNumber}
        proposalType={proposal.type as ChangeProposalType}
        poolStatus={poolStatus}
        authorName={authorName}
        createdAt={proposal.createdAt}
        artefactVersion={proposal.artefactVersion}
      />
      <PMAccordion.ItemContent>
        <ChangeProposalCardBody
          proposal={proposal}
          recipe={recipe}
          viewMode={viewMode}
          poolStatus={poolStatus}
          isEditing={isEditing}
          editedValue={editedValue}
          isOutdated={isOutdated}
          isBlockedByConflict={isBlockedByConflict}
          isEditModified={isEditModified}
          onViewModeChange={onViewModeChange}
          onEdit={onEdit}
          onAccept={onAccept}
          onDismiss={onDismiss}
          onUndo={onUndo}
          onEditedValueChange={onEditedValueChange}
          onResetToOriginal={onResetToOriginal}
          onCancelEdit={onCancelEdit}
          onSaveAndAccept={onSaveAndAccept}
        />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
