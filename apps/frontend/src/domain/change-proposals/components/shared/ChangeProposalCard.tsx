import { ReactNode } from 'react';
import { PMAccordion } from '@packmind/ui';
import { ChangeProposalType } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { ChangeProposalCardHeader } from './ChangeProposalCardHeader';
import { ChangeProposalCardBody } from './ChangeProposalCardBody';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalCardProps {
  proposal: ChangeProposalWithConflicts;
  proposalNumber: number;
  poolStatus: PoolStatus;
  authorName: string;
  viewMode: ViewMode;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  showToolbar?: boolean;
  showEditButton?: boolean;
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

export function ChangeProposalCard({
  proposal,
  proposalNumber,
  poolStatus,
  authorName,
  viewMode,
  isOutdated,
  isBlockedByConflict,
  showToolbar,
  showEditButton,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  renderExpandedView,
}: Readonly<ChangeProposalCardProps>) {
  return (
    <PMAccordion.Item
      value={proposal.id}
      border="1px solid"
      borderColor="border.tertiary"
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
          viewMode={viewMode}
          poolStatus={poolStatus}
          isOutdated={isOutdated}
          isBlockedByConflict={isBlockedByConflict}
          showToolbar={showToolbar}
          showEditButton={showEditButton}
          onViewModeChange={onViewModeChange}
          onEdit={onEdit}
          onAccept={onAccept}
          onDismiss={onDismiss}
          onUndo={onUndo}
          renderExpandedView={renderExpandedView}
        />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
