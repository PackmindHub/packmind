import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIconButton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalStatus,
  UserId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import {
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuUndo2,
  LuX,
} from 'react-icons/lu';
import {
  getChangeProposalFieldLabel,
  getStatusBadgeProps,
} from '../../utils/changeProposalHelpers';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

interface ChangeProposalsChangesListProps {
  proposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
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
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: ChangeProposalsChangesListProps) {
  const [showAccepted, setShowAccepted] = useState(true);
  const [showRejected, setShowRejected] = useState(true);

  const {
    reviewingProposal,
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
        !rejectedProposalIds.has(p.id) &&
        p.id !== reviewingProposalId,
    );

    const accepted = proposals.filter((p) => acceptedProposalIds.has(p.id));
    const rejected = proposals.filter((p) => rejectedProposalIds.has(p.id));

    return {
      reviewingProposal: reviewing,
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

          {reviewingProposal && (
            <ReviewingSection
              proposal={reviewingProposal}
              userLookup={userLookup}
            />
          )}

          {reviewingProposal && reviewingProposal.conflictsWith.length > 0 && (
            <ConflictWithSection
              reviewingProposal={reviewingProposal}
              proposals={proposals}
              userLookup={userLookup}
              onSelectProposal={onSelectProposal}
            />
          )}

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
                  userLookup={userLookup}
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
                  userLookup={userLookup}
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
                  userLookup={userLookup}
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

function ReviewingSection({
  proposal,
  userLookup,
}: {
  proposal: ChangeProposalWithConflicts;
  userLookup: Map<UserId, string>;
}) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';
  const statusBadge = getStatusBadgeProps(proposal.status);

  return (
    <PMVStack gap={2}>
      <PMText
        fontSize="xs"
        fontWeight="bold"
        color="secondary"
        textTransform="uppercase"
        width="full"
      >
        Reviewing
      </PMText>
      <PMBox
        borderRadius="md"
        p={3}
        width="full"
        backgroundColor="background.tertiary"
      >
        <PMVStack
          gap={2}
          flex={1}
          alignItems="flex-start"
          justifyContent="center"
        >
          <PMHStack gap={2} justify="space-between" align="center" width="full">
            <PMBadge colorPalette={statusBadge.colorPalette} size="sm">
              {statusBadge.label}
            </PMBadge>
            <PMText fontSize="xs" color="secondary">
              {formatRelativeTime(proposal.createdAt)}
            </PMText>
          </PMHStack>
          <PMText fontSize="sm" fontWeight="bold">
            {getChangeProposalFieldLabel(proposal.type)}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            <PMText as="span" fontWeight="bold">
              From
            </PMText>{' '}
            {authorEmail}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            <PMText as="span" fontWeight="bold">
              Base version
            </PMText>{' '}
            {proposal.artefactVersion}
          </PMText>
        </PMVStack>
      </PMBox>
    </PMVStack>
  );
}

function ConflictWithSection({
  reviewingProposal,
  proposals,
  userLookup,
  onSelectProposal,
}: {
  reviewingProposal: ChangeProposalWithConflicts;
  proposals: ChangeProposalWithConflicts[];
  userLookup: Map<UserId, string>;
  onSelectProposal: (proposalId: ChangeProposalId) => void;
}) {
  const conflictingProposals = proposals.filter((p) =>
    reviewingProposal.conflictsWith.includes(p.id),
  );

  if (conflictingProposals.length === 0) {
    return null;
  }

  return (
    <PMVStack gap={2}>
      <PMText
        fontSize="xs"
        fontWeight="bold"
        color="secondary"
        textTransform="uppercase"
        width="full"
      >
        Conflict with
      </PMText>
      {conflictingProposals.map((proposal) => (
        <PMBox
          key={proposal.id}
          borderRadius="md"
          border="1px solid"
          borderColor="border.tertiary"
          cursor="pointer"
          width="full"
          p={2}
          _hover={{ background: 'background.tertiary' }}
          onClick={() => onSelectProposal(proposal.id)}
        >
          <PMVStack gap={0} flex={1}>
            <PMText fontSize="sm" fontWeight="medium">
              {getChangeProposalFieldLabel(proposal.type)}
            </PMText>
            <PMText fontSize="xs" color="secondary">
              {formatRelativeTime(proposal.createdAt)} -{' '}
              {userLookup.get(proposal.createdBy) ?? 'Unknown user'}
            </PMText>
          </PMVStack>
        </PMBox>
      ))}
    </PMVStack>
  );
}

function PendingProposalCard({
  proposal,
  userLookup,
  onSelect,
  onAccept,
  onReject,
}: {
  proposal: ChangeProposalWithConflicts;
  userLookup: Map<UserId, string>;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';

  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor="border.tertiary"
      cursor="pointer"
      width="full"
      p={2}
      _hover={{ background: 'background.tertiary' }}
      onClick={onSelect}
    >
      <PMHStack gap={2} justify="space-between" align="center">
        <PMVStack gap={0} flex={1}>
          <PMText fontSize="sm" fontWeight="medium">
            {getChangeProposalFieldLabel(proposal.type)}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            {formatRelativeTime(proposal.createdAt)} - {authorEmail}
          </PMText>
        </PMVStack>
        <PMHStack gap={1}>
          <PMIconButton
            aria-label="Accept proposal"
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            <LuCheck size={14} />
          </PMIconButton>
          <PMIconButton
            aria-label="Reject proposal"
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
          >
            <LuX size={14} />
          </PMIconButton>
        </PMHStack>
      </PMHStack>
    </PMBox>
  );
}

function CollapsiblePoolSection({
  label,
  count,
  isOpen,
  onToggle,
  colorPalette,
  children,
}: {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  colorPalette: string;
  children: React.ReactNode;
}) {
  return (
    <PMVStack gap={2}>
      <PMHStack
        gap={1}
        align="center"
        width="full"
        cursor="pointer"
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
      >
        {isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <PMText
          fontSize="xs"
          fontWeight="bold"
          color="secondary"
          textTransform="uppercase"
        >
          {label}
        </PMText>
        <PMBadge colorPalette={colorPalette} size="sm">
          {count}
        </PMBadge>
      </PMHStack>
      {isOpen && <PMVStack gap={1}>{children}</PMVStack>}
    </PMVStack>
  );
}

function PoolProposalCard({
  proposal,
  userLookup,
  onUndo,
}: {
  proposal: ChangeProposalWithConflicts;
  userLookup: Map<UserId, string>;
  onUndo: () => void;
}) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';

  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor="border.tertiary"
      p={2}
      width="full"
    >
      <PMHStack gap={2} justify="space-between" align="center">
        <PMVStack gap={0} flex={1}>
          <PMText fontSize="sm" fontWeight="medium">
            {getChangeProposalFieldLabel(proposal.type)}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            {formatRelativeTime(proposal.createdAt)} - {authorEmail}
          </PMText>
        </PMVStack>
        <PMIconButton
          aria-label="Undo"
          size="xs"
          variant="ghost"
          onClick={onUndo}
        >
          <LuUndo2 size={14} />
        </PMIconButton>
      </PMHStack>
    </PMBox>
  );
}
