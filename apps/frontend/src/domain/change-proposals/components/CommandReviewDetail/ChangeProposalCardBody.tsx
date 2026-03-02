import { PMSeparator, PMVStack } from '@packmind/ui';
import { ChangeProposalId, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { isMarkdownContent } from '../../utils/isMarkdownContent';
import { ProposalMessage } from '../shared/ProposalMessage';
import { CardToolbar } from '../shared/CardToolbar';
import { DiffView } from '../shared/DiffView';
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
  const { oldValue, newValue } = extractProposalDiffValues(proposal);
  const markdown = isMarkdownContent(proposal.type);

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
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              onEdit={onEdit}
              onAccept={onAccept}
              onDismiss={onDismiss}
              onUndo={onUndo}
            />
          </PMVStack>
        </>
      )}

      {proposal.message && (
        <>
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <ProposalMessage message={proposal.message} />
          </PMVStack>
        </>
      )}

      <PMSeparator borderColor="border.tertiary" />
      <PMVStack p={4} alignItems="stretch">
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
        ) : viewMode === 'focused' ? (
          <DiffView
            oldValue={oldValue}
            newValue={newValue}
            isMarkdownContent={markdown}
          />
        ) : viewMode === 'diff' ? (
          <FocusedView recipe={recipe} proposal={proposal} />
        ) : (
          <InlineView recipe={recipe} proposal={proposal} />
        )}
      </PMVStack>
    </PMVStack>
  );
}
