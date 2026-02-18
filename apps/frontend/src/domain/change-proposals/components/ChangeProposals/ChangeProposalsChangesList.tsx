import { useMemo, useState } from 'react';
import { PMBox, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalStatus,
  UserId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { PendingProposalCard } from './PendingProposalCard';
import { PoolProposalCard } from './PoolProposalCard';
import { CollapsiblePoolSection } from './CollapsiblePoolSection';

interface ChangeProposalsChangesListProps {
  proposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  currentArtefactVersion?: number;
  userLookup: Map<UserId, string>;
  onSelectProposal: (proposalId: ChangeProposalId) => void;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
}

export function ChangeProposalsChangesList({
  proposals,
  reviewingProposalId,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  currentArtefactVersion,
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: ChangeProposalsChangesListProps) {
  const [showAccepted, setShowAccepted] = useState(true);
  const [showRejected, setShowRejected] = useState(true);

  const {
    conflictingIds,
    pendingProposals,
    acceptedProposals,
    rejectedProposals,
  } = useMemo(() => {
    const reviewing =
      proposals.find((p) => p.id === reviewingProposalId) ?? null;

    const pending = proposals.filter(
      (p) =>
        p.status === ChangeProposalStatus.pending &&
        !acceptedProposalIds.has(p.id) &&
        !rejectedProposalIds.has(p.id),
    );

    const accepted = proposals.filter((p) => acceptedProposalIds.has(p.id));
    const rejected = proposals.filter((p) => rejectedProposalIds.has(p.id));

    return {
      conflictingIds: new Set<ChangeProposalId>(reviewing?.conflictsWith ?? []),
      pendingProposals: pending,
      acceptedProposals: accepted,
      rejectedProposals: rejected,
    };
  }, [
    proposals,
    reviewingProposalId,
    acceptedProposalIds,
    rejectedProposalIds,
  ]);

  return (
    <PMBox display="flex" flexDirection="column" height="full">
      <PMBox overflowY="auto" flex={1}>
        <PMVStack gap={4} align="stretch">
          <PMText fontSize="md" fontWeight="bold">
            Changes to review
          </PMText>

          {pendingProposals.length > 0 && (
            <PMVStack gap={2}>
              <PMText
                fontSize="xs"
                fontWeight="bold"
                color="secondary"
                textTransform="uppercase"
                width="full"
              >
                Pending ({pendingProposals.length})
              </PMText>
              {pendingProposals.map((proposal) => (
                <PendingProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isSelected={proposal.id === reviewingProposalId}
                  isConflicting={conflictingIds.has(proposal.id)}
                  isBlockedByConflict={blockedByConflictIds.has(proposal.id)}
                  userLookup={userLookup}
                  currentArtefactVersion={currentArtefactVersion}
                  onSelect={() => onSelectProposal(proposal.id)}
                  onAccept={() => onPoolAccept(proposal.id)}
                  onReject={() => onPoolReject(proposal.id)}
                />
              ))}
            </PMVStack>
          )}

          {acceptedProposals.length > 0 && (
            <CollapsiblePoolSection
              label="Accepted"
              count={acceptedProposals.length}
              isOpen={showAccepted}
              onToggle={() => setShowAccepted((prev) => !prev)}
              colorPalette="green"
            >
              {acceptedProposals.map((proposal) => (
                <PoolProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isSelected={proposal.id === reviewingProposalId}
                  userLookup={userLookup}
                  currentArtefactVersion={currentArtefactVersion}
                  onSelect={() => onSelectProposal(proposal.id)}
                  onUndo={() => onUndoPool(proposal.id)}
                />
              ))}
            </CollapsiblePoolSection>
          )}

          {rejectedProposals.length > 0 && (
            <CollapsiblePoolSection
              label="Dismissed"
              count={rejectedProposals.length}
              isOpen={showRejected}
              onToggle={() => setShowRejected((prev) => !prev)}
              colorPalette="red"
            >
              {rejectedProposals.map((proposal) => (
                <PoolProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isSelected={proposal.id === reviewingProposalId}
                  userLookup={userLookup}
                  currentArtefactVersion={currentArtefactVersion}
                  onSelect={() => onSelectProposal(proposal.id)}
                  onUndo={() => onUndoPool(proposal.id)}
                />
              ))}
            </CollapsiblePoolSection>
          )}

          {proposals.length === 0 && (
            <PMBox py={4} textAlign="center">
              <PMText fontSize="sm" color="secondary">
                No pending proposals for this command
              </PMText>
            </PMBox>
          )}
        </PMVStack>
      </PMBox>
    </PMBox>
  );
}
