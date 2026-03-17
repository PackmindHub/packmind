import { ReactNode } from 'react';
import { PMAccordion } from '@packmind/ui';
import {
  ChangeProposalDecision,
  ChangeProposalType,
  ScalarUpdatePayload,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { isEditableProposalType } from '../../utils/editableProposalTypes';
import { ChangeProposalCardHeader } from './ChangeProposalCardHeader';
import { ChangeProposalCardBody } from './ChangeProposalCardBody';

function isRemoveProposal(type: ChangeProposalType): boolean {
  return (
    type === ChangeProposalType.removeStandard ||
    type === ChangeProposalType.removeCommand ||
    type === ChangeProposalType.removeSkill
  );
}

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
  filePath?: string;
  decision?: ChangeProposalDecision | null;
  onViewModeChange: (mode: ViewMode) => void;
  onEdit: () => void;
  onAccept: (decision: ChangeProposalDecision) => void;
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
  filePath,
  decision,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  renderExpandedView,
}: Readonly<ChangeProposalCardProps>) {
  const isRemoval = isRemoveProposal(proposal.type as ChangeProposalType);
  const proposalType = proposal.type as ChangeProposalType;
  const isEdited =
    isEditableProposalType(proposalType) &&
    decision != null &&
    (decision as ScalarUpdatePayload).newValue !==
      (proposal.payload as ScalarUpdatePayload).newValue;

  return (
    <PMAccordion.Item
      value={proposal.id}
      border="1px solid"
      borderColor={isRemoval ? 'red.800' : 'border.tertiary'}
      borderRadius="md"
      width="full"
    >
      <ChangeProposalCardHeader
        proposalNumber={proposalNumber}
        proposalType={proposalType}
        poolStatus={poolStatus}
        isOutdated={isOutdated}
        isEdited={isEdited}
        authorName={authorName}
        createdAt={proposal.createdAt}
        artefactVersion={proposal.artefactVersion}
        filePath={filePath}
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
          decision={decision}
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
