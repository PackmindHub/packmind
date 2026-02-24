import { PMIconButton } from '@packmind/ui';
import { ChangeProposalId, UserId } from '@packmind/types';
import { LuUndo2 } from 'react-icons/lu';
import { ChangeProposalWithConflicts } from '../../types';
import { ProposalCardBase } from './ProposalCardBase';

interface PoolProposalCardProps {
  proposal: ChangeProposalWithConflicts;
  isSelected: boolean;
  proposalNumber?: number;
  userLookup: Map<UserId, string>;
  outdatedProposalIds: Set<ChangeProposalId>;
  onSelect: () => void;
  onUndo: () => void;
}

export function PoolProposalCard({
  proposal,
  isSelected,
  proposalNumber,
  userLookup,
  outdatedProposalIds,
  onSelect,
  onUndo,
}: PoolProposalCardProps) {
  return (
    <ProposalCardBase
      proposal={proposal}
      isSelected={isSelected}
      proposalNumber={proposalNumber}
      userLookup={userLookup}
      outdatedProposalIds={outdatedProposalIds}
      onSelect={onSelect}
      actions={
        <PMIconButton
          aria-label="Undo"
          size="xs"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}
        >
          <LuUndo2 size={14} />
        </PMIconButton>
      }
    />
  );
}
