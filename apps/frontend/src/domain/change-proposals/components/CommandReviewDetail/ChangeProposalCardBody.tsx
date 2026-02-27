import { PMSeparator, PMVStack } from '@packmind/ui';
import { ChangeProposalId, ChangeProposalType, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCommandReviewState';
import { ProposalMessage } from './ProposalMessage';
import { CardToolbar } from './CardToolbar';
import { DiffView } from './DiffView';
import { FocusedView } from './FocusedView';
import { InlineView } from './InlineView';
import { EditView } from './EditView';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalCardBodyProps {
  proposal: ChangeProposalWithConflicts;
  recipe: Recipe;
  viewMode: ViewMode;
  poolStatus: PoolStatus;
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

export function ChangeProposalCardBody({
  proposal,
  recipe,
  viewMode,
  poolStatus,
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
}: Readonly<ChangeProposalCardBodyProps>) {
  const isDescriptionField =
    proposal.type === ChangeProposalType.updateCommandDescription;
  const payload = proposal.payload as { oldValue: string; newValue: string };

  return (
    <PMVStack gap={0} alignItems="stretch">
      {!isEditing && (
        <>
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <CardToolbar
              poolStatus={poolStatus}
              isOutdated={isOutdated}
              isBlockedByConflict={isBlockedByConflict}
              onEdit={onEdit}
              onAccept={onAccept}
              onDismiss={onDismiss}
              onUndo={onUndo}
              onShowInFile={() => onViewModeChange('focused')}
            />
          </PMVStack>
        </>
      )}

      {proposal.message && (
        <>
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4}>
            <ProposalMessage message={proposal.message} />
          </PMVStack>
        </>
      )}

      <PMSeparator borderColor="border.tertiary" />
      <PMVStack p={4}>
        {isEditing ? (
          <EditView
            proposal={proposal}
            editedValue={editedValue}
            onEditedValueChange={(v) => onEditedValueChange(proposal.id, v)}
            onResetToOriginal={() => onResetToOriginal(proposal.id)}
            onCancel={onCancelEdit}
            onSaveAndAccept={() => onSaveAndAccept(proposal.id)}
            isModified={isEditModified}
          />
        ) : viewMode === 'diff' ? (
          <DiffView
            oldValue={payload.oldValue}
            newValue={payload.newValue}
            isDescriptionField={isDescriptionField}
          />
        ) : viewMode === 'focused' ? (
          <FocusedView recipe={recipe} proposal={proposal} />
        ) : (
          <InlineView
            oldValue={payload.oldValue}
            newValue={payload.newValue}
            isDescriptionField={isDescriptionField}
          />
        )}
      </PMVStack>
    </PMVStack>
  );
}
