import { PMHStack, PMIconButton } from '@packmind/ui';
import { UserId } from '@packmind/types';
import { LuCheck, LuX } from 'react-icons/lu';
import { ChangeProposalWithConflicts } from '../../types';
import { ProposalCardBase } from './ProposalCardBase';

interface PendingProposalCardProps {
  proposal: ChangeProposalWithConflicts;
  isSelected: boolean;
  isConflicting: boolean;
  isBlockedByConflict: boolean;
  userLookup: Map<UserId, string>;
  currentArtefactVersion?: number;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export function PendingProposalCard({
  proposal,
  isSelected,
  isConflicting,
  isBlockedByConflict,
  userLookup,
  currentArtefactVersion,
  onSelect,
  onAccept,
  onReject,
}: PendingProposalCardProps) {
  const isOutdated =
    currentArtefactVersion !== undefined &&
    proposal.artefactVersion !== currentArtefactVersion;

  return (
    <ProposalCardBase
      proposal={proposal}
      isSelected={isSelected}
      borderColor={isConflicting ? 'border.error' : 'border.tertiary'}
      userLookup={userLookup}
      currentArtefactVersion={currentArtefactVersion}
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
