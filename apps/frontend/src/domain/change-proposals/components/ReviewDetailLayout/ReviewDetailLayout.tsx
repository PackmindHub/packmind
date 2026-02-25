import { ReactNode } from 'react';
import { PMBox, PMButton, PMHStack, PMSwitch, PMText } from '@packmind/ui';
import { ChangeProposalId, UserId } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ChangeProposalsChangesList } from '../ChangeProposals/ChangeProposalsChangesList';

interface ReviewDetailLayoutProps {
  proposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  hasPooledDecisions: boolean;
  outdatedProposalIds: Set<ChangeProposalId>;
  userLookup: Map<UserId, string>;
  showUnifiedView: boolean;
  onSelectProposal: (proposalId: ChangeProposalId) => void;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
  onUnifiedViewChange: (checked: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  children: ReactNode;
}

export function ReviewDetailLayout({
  proposals,
  reviewingProposalId,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  hasPooledDecisions,
  outdatedProposalIds,
  userLookup,
  showUnifiedView,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
  onUnifiedViewChange,
  onSave,
  isSaving,
  children,
}: Readonly<ReviewDetailLayoutProps>) {
  return (
    <>
      <PMBox
        gridColumn="span 2"
        borderBottomWidth="1px"
        paddingX={6}
        paddingY={2}
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        gap={4}
        minH="44px"
      >
        {acceptedProposalIds.size > 0 && (
          <PMHStack gap={2} alignItems="center">
            <PMSwitch
              size="sm"
              checked={showUnifiedView}
              onCheckedChange={(e) => onUnifiedViewChange(e.checked)}
            />
            <PMText fontSize="sm">Preview changes</PMText>
          </PMHStack>
        )}
        <PMButton
          size="sm"
          colorPalette="blue"
          disabled={isSaving || !hasPooledDecisions}
          onClick={onSave}
        >
          {isSaving ? 'Applying...' : 'Apply changes'}
        </PMButton>
      </PMBox>
      <PMBox minW={0} overflowY="auto">
        {children}
      </PMBox>
      <PMBox borderLeftWidth="1px" p={4} overflowY="auto">
        <ChangeProposalsChangesList
          proposals={proposals}
          reviewingProposalId={reviewingProposalId}
          acceptedProposalIds={acceptedProposalIds}
          rejectedProposalIds={rejectedProposalIds}
          blockedByConflictIds={blockedByConflictIds}
          outdatedProposalIds={outdatedProposalIds}
          userLookup={userLookup}
          onSelectProposal={onSelectProposal}
          onPoolAccept={onPoolAccept}
          onPoolReject={onPoolReject}
          onUndoPool={onUndoPool}
        />
      </PMBox>
    </>
  );
}
