import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMSwitch,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { ChangeProposalId, UserId } from '@packmind/types';
import { LuCheck, LuCircleAlert, LuUndo2, LuX } from 'react-icons/lu';
import {
  getChangeProposalFieldLabel,
  getStatusBadgeProps,
} from '../../utils/changeProposalHelpers';
import { ConflictWarning } from '../ChangeProposals/ConflictWarning';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { ChangeProposalWithConflicts } from '../../types';

interface ProposalReviewHeaderProps {
  proposal: ChangeProposalWithConflicts;
  isOutdated: boolean;
  proposalNumberMap: Map<ChangeProposalId, number>;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  blockedByAcceptedMap: Map<ChangeProposalId, ChangeProposalId[]>;
  userLookup: Map<UserId, string>;
  showDiffPreviewToggle: boolean;
  showPreview: boolean;
  onPreviewChange: (checked: boolean) => void;
  onSelectProposal: (id: ChangeProposalId) => void;
  onPoolAccept: (id: ChangeProposalId) => void;
  onPoolReject: (id: ChangeProposalId) => void;
  onUndoPool: (id: ChangeProposalId) => void;
}

export function ProposalReviewHeader({
  proposal,
  isOutdated,
  proposalNumberMap,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  blockedByAcceptedMap,
  userLookup,
  showDiffPreviewToggle,
  showPreview,
  onPreviewChange,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: Readonly<ProposalReviewHeaderProps>) {
  const statusBadge = getStatusBadgeProps(proposal.status);

  const acceptedIds = blockedByConflictIds.has(proposal.id)
    ? (blockedByAcceptedMap.get(proposal.id) ?? [])
    : [];
  const conflictingNumbers = acceptedIds
    .map((id) => ({ id, number: proposalNumberMap.get(id) ?? 0 }))
    .sort((a, b) => a.number - b.number);

  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
      p={4}
    >
      <PMVStack gap={3}>
        <PMHStack justify="space-between" align="center" width="full">
          <PMHStack gap={3} align="center">
            {isOutdated ? (
              <PMTooltip label="This proposal was made on an outdated version">
                <PMBadge colorPalette="orange" variant="subtle" size="sm">
                  <PMIcon>
                    <LuCircleAlert />
                  </PMIcon>
                  Outdated
                </PMBadge>
              </PMTooltip>
            ) : (
              <PMBadge colorPalette={statusBadge.colorPalette} size="sm">
                {statusBadge.label}
              </PMBadge>
            )}
            <PMText fontSize="sm" color="secondary">
              #{proposalNumberMap.get(proposal.id)} -{' '}
              {formatRelativeTime(proposal.createdAt)}
            </PMText>
          </PMHStack>
          <PMHStack gap={6} align="center">
            {showDiffPreviewToggle && (
              <PMHStack gap={2} align="center">
                <PMText fontSize="sm" color={showPreview ? 'faded' : 'primary'}>
                  Diff
                </PMText>
                <PMSwitch
                  size="sm"
                  checked={showPreview}
                  onCheckedChange={(e) => onPreviewChange(e.checked)}
                  css={{
                    '& span[data-scope="switch"][data-part="control"]': {
                      bg: 'background.primary',
                    },
                  }}
                />
                <PMText fontSize="sm" color={showPreview ? 'primary' : 'faded'}>
                  Preview
                </PMText>
              </PMHStack>
            )}
            {acceptedProposalIds.has(proposal.id) ||
            rejectedProposalIds.has(proposal.id) ? (
              <PMButton
                size="sm"
                variant="outline"
                onClick={() => onUndoPool(proposal.id)}
              >
                <LuUndo2 />
                Undo
              </PMButton>
            ) : (
              <PMHStack gap={2}>
                <PMButton
                  size="xs"
                  variant="secondary"
                  disabled={isOutdated || blockedByConflictIds.has(proposal.id)}
                  onClick={() => onPoolAccept(proposal.id)}
                >
                  <LuCheck />
                  Accept
                </PMButton>
                <PMButton
                  size="xs"
                  variant="secondary"
                  onClick={() => onPoolReject(proposal.id)}
                >
                  <LuX />
                  Dismiss
                </PMButton>
              </PMHStack>
            )}
          </PMHStack>
        </PMHStack>
        {conflictingNumbers.length > 0 && (
          <ConflictWarning
            conflictingAcceptedNumbers={conflictingNumbers}
            onSelectConflicting={onSelectProposal}
          />
        )}
        <PMVStack gap={1} align="stretch" width="full">
          <PMText fontWeight="bold" fontSize="sm">
            {getChangeProposalFieldLabel(proposal.type)}
          </PMText>
          <PMHStack gap={1}>
            <PMText fontWeight="bold" fontSize="sm">
              From
            </PMText>
            <PMText fontSize="sm">
              {userLookup.get(proposal.createdBy) ?? 'Unknown user'}
            </PMText>
          </PMHStack>
          <PMHStack gap={1}>
            <PMText fontWeight="bold" fontSize="sm">
              Base version
            </PMText>
            <PMText fontSize="sm">{proposal.artefactVersion}</PMText>
          </PMHStack>
        </PMVStack>
      </PMVStack>
    </PMBox>
  );
}
