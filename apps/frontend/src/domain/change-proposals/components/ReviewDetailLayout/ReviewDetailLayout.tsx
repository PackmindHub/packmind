import { ReactNode } from 'react';
import { PMBox, PMButton, PMHStack, PMText } from '@packmind/ui';
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
  currentArtefactVersion?: number;
  userLookup: Map<UserId, string>;
  onSelectProposal: (proposalId: ChangeProposalId) => void;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
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
  currentArtefactVersion,
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
  onSave,
  isSaving,
  children,
}: Readonly<ReviewDetailLayoutProps>) {
  return (
    <>
      <PMBox
        gridColumn="span 2"
        borderBottomWidth="1px"
        paddingX={4}
        paddingY={2}
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        minH="40px"
      >
        {hasPooledDecisions && (
          <PMHStack gap={2}>
            <PMText fontSize="sm" color="secondary">
              {acceptedProposalIds.size} accepted, {rejectedProposalIds.size}{' '}
              rejected
            </PMText>
            <PMButton
              size="sm"
              colorPalette="blue"
              disabled={isSaving}
              onClick={onSave}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </PMButton>
          </PMHStack>
        )}
      </PMBox>
      <PMBox minW={0} overflowY="auto" p={4}>
        {children}
      </PMBox>
      <PMBox borderLeftWidth="1px" p={4} overflowY="auto">
        <ChangeProposalsChangesList
          proposals={proposals}
          reviewingProposalId={reviewingProposalId}
          acceptedProposalIds={acceptedProposalIds}
          rejectedProposalIds={rejectedProposalIds}
          blockedByConflictIds={blockedByConflictIds}
          currentArtefactVersion={currentArtefactVersion}
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
