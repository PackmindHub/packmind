import { ReactNode } from 'react';
import { PMSeparator, PMVStack } from '@packmind/ui';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { isMarkdownContent } from '../../utils/isMarkdownContent';
import { ProposalMessage } from './ProposalMessage';
import { CardToolbar } from './CardToolbar';
import { DiffView } from './DiffView';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalCardBodyProps {
  proposal: ChangeProposalWithConflicts;
  viewMode: ViewMode;
  poolStatus: PoolStatus;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  showToolbar?: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onEdit: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
  renderExpandedView?: (
    viewMode: ViewMode,
    proposal: ChangeProposalWithConflicts,
  ) => ReactNode;
}

export function ChangeProposalCardBody({
  proposal,
  viewMode,
  poolStatus,
  isOutdated,
  isBlockedByConflict,
  showToolbar = true,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  renderExpandedView,
}: Readonly<ChangeProposalCardBodyProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);
  const markdown = isMarkdownContent(proposal.type);

  return (
    <PMVStack gap={0} alignItems="stretch">
      {showToolbar && (
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
        {!showToolbar && renderExpandedView ? (
          renderExpandedView(viewMode, proposal)
        ) : viewMode === 'focused' ? (
          <DiffView
            oldValue={oldValue}
            newValue={newValue}
            isMarkdownContent={markdown}
          />
        ) : renderExpandedView ? (
          renderExpandedView(viewMode, proposal)
        ) : null}
      </PMVStack>
    </PMVStack>
  );
}
