import { PMIconButton } from '@packmind/ui';
import { UserId } from '@packmind/types';
import { LuUndo2 } from 'react-icons/lu';
import { ChangeProposalWithConflicts } from '../../types';
import { ProposalCardBase } from './ProposalCardBase';

interface PoolProposalCardProps {
  proposal: ChangeProposalWithConflicts;
  isSelected: boolean;
  proposalNumber?: number;
  userLookup: Map<UserId, string>;
  currentArtefactVersion?: number;
  onSelect: () => void;
  onUndo: () => void;
}

export function PoolProposalCard({
  proposal,
  isSelected,
  proposalNumber,
  userLookup,
  currentArtefactVersion,
  onSelect,
  onUndo,
}: PoolProposalCardProps) {
  return (
    <ProposalCardBase
      proposal={proposal}
      isSelected={isSelected}
      proposalNumber={proposalNumber}
      userLookup={userLookup}
      currentArtefactVersion={currentArtefactVersion}
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
