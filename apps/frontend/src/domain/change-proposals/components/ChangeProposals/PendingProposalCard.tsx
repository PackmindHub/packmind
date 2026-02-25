import { PMHStack, PMIconButton, PMTooltip } from '@packmind/ui';
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

function AcceptIconButton({
  isOutdated,
  isBlocked,
  onAccept,
}: {
  isOutdated: boolean;
  isBlocked: boolean;
  onAccept: () => void;
}) {
  const isDisabled = isOutdated || isBlocked;

  const button = (
    <PMIconButton
      aria-label="Accept proposal"
      size="xs"
      variant="solid"
      disabled={isDisabled}
      onClick={onAccept}
    >
      <LuCheck size={14} />
    </PMIconButton>
  );

  if (isOutdated) {
    return (
      <PMTooltip label="This proposal is based on an outdated version">
        {button}
      </PMTooltip>
    );
  }

  if (isBlocked) {
    return (
      <PMTooltip label="Conflicts with an accepted proposal">
        {button}
      </PMTooltip>
    );
  }

  return button;
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
          <AcceptIconButton
            isOutdated={isOutdated}
            isBlocked={isBlockedByConflict}
            onAccept={onAccept}
          />
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
