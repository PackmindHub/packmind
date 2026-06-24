import { useMemo, useState } from 'react';
import { PMBadge, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalStatus,
  UserId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { buildProposalNumberMap } from '../../utils/changeProposalHelpers';
import { PendingProposalCard } from './PendingProposalCard';
import { PoolProposalCard } from './PoolProposalCard';
import { CollapsiblePoolSection } from './CollapsiblePoolSection';

interface ChangeProposalsChangesListProps {
  proposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  outdatedProposalIds: Set<ChangeProposalId>;
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
  outdatedProposalIds,
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: ChangeProposalsChangesListProps) {
  const [showAccepted, setShowAccepted] = useState(true);
  const [showRejected, setShowRejected] = useState(true);

  const proposalNumberMap = useMemo(
    () => buildProposalNumberMap(proposals),
    [proposals],
  );

  const sortByDate = (
    a: ChangeProposalWithConflicts,
    b: ChangeProposalWithConflicts,
  ) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const { pendingProposals, acceptedProposals, rejectedProposals } =
    useMemo(() => {
      const pending = proposals
        .filter(
          (p) =>
            p.status === ChangeProposalStatus.pending &&
            !acceptedProposalIds.has(p.id) &&
            !rejectedProposalIds.has(p.id),
        )
        .sort(sortByDate);

      const accepted = proposals
        .filter((p) => acceptedProposalIds.has(p.id))
        .sort(sortByDate);
      const rejected = proposals
        .filter((p) => rejectedProposalIds.has(p.id))
        .sort(sortByDate);

      return {
        pendingProposals: pending,
        acceptedProposals: accepted,
        rejectedProposals: rejected,
      };
    }, [proposals, acceptedProposalIds, rejectedProposalIds]);

  return (
    <PMBox display="flex" flexDirection="column" height="full">
      <PMBox overflowY="auto" flex={1}>
        <PMVStack gap={4} align="stretch">
          <PMText fontSize="md" fontWeight="bold">
            Changes to review
          </PMText>

          {pendingProposals.length > 0 && (
            <PMVStack gap={2}>
              <PMHStack gap={1} align="center" width="full">
                <PMText
                  fontSize="xs"
                  fontWeight="bold"
                  color="secondary"
                  textTransform="uppercase"
                >
                  Pending
                </PMText>
                <PMBadge colorPalette="blue" size="sm">
                  {pendingProposals.length}
                </PMBadge>
              </PMHStack>
              {pendingProposals.map((proposal) => (
                <PendingProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isSelected={proposal.id === reviewingProposalId}
                  isBlockedByConflict={blockedByConflictIds.has(proposal.id)}
                  proposalNumber={proposalNumberMap.get(proposal.id)}
                  userLookup={userLookup}
                  outdatedProposalIds={outdatedProposalIds}
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
                  proposalNumber={proposalNumberMap.get(proposal.id)}
                  userLookup={userLookup}
                  outdatedProposalIds={outdatedProposalIds}
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
                  proposalNumber={proposalNumberMap.get(proposal.id)}
                  userLookup={userLookup}
                  outdatedProposalIds={outdatedProposalIds}
                  onSelect={() => onSelectProposal(proposal.id)}
                  onUndo={() => onUndoPool(proposal.id)}
                />
              ))}
            </CollapsiblePoolSection>
          )}

          {proposals.length === 0 && (
            <PMBox py={4} textAlign="center">
              <PMText fontSize="sm" color="secondary">
                No pending proposals
              </PMText>
            </PMBox>
          )}
        </PMVStack>
      </PMBox>
    </PMBox>
  );
}
