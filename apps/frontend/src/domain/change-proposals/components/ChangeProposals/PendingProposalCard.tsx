import { PMHStack, PMIconButton } from '@packmind/ui';
import { ChangeProposalId, UserId } from '@packmind/types';
import { LuCheck, LuX } from 'react-icons/lu';
import { ChangeProposalWithConflicts } from '../../types';
import { ProposalCardBase } from './ProposalCardBase';

interface PendingProposalCardProps {
  proposal: ChangeProposalWithConflicts;
  isSelected: boolean;
  isBlockedByConflict: boolean;
  proposalNumber?: number;
  userLookup: Map<UserId, string>;
  outdatedProposalIds: Set<ChangeProposalId>;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export function PendingProposalCard({
  proposal,
  isSelected,
  isBlockedByConflict,
  proposalNumber,
  userLookup,
  outdatedProposalIds,
  onSelect,
  onAccept,
  onReject,
}: PendingProposalCardProps) {
  const isOutdated = outdatedProposalIds.has(proposal.id);

  return (
    <ProposalCardBase
      proposal={proposal}
      isSelected={isSelected}
      borderColor={isBlockedByConflict ? 'border.error' : 'border.tertiary'}
      proposalNumber={proposalNumber}
      userLookup={userLookup}
      outdatedProposalIds={outdatedProposalIds}
      onSelect={onSelect}
      actions={
        <PMHStack gap={1}>
          <PMIconButton
            aria-label="Accept proposal"
            size="xs"
            variant="solid"
            disabled={isOutdated || isBlockedByConflict}
            onClick={onAccept}
          >
            <LuCheck size={14} />
          </PMIconButton>
          <PMIconButton
            aria-label="Reject proposal"
            size="xs"
            variant="solid"
            onClick={onReject}
          >
            <LuX size={14} />
          </PMIconButton>
        </PMHStack>
      }
    />
  );
}
