import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
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
  LuTriangleAlert,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuUndo2,
  LuX,
} from 'react-icons/lu';
import { getChangeProposalFieldLabel } from '../../utils/changeProposalHelpers';

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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
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
        <PMVStack gap={4}>
          {reviewingProposal && (
            <ReviewingSection
              proposal={reviewingProposal}
              userLookup={userLookup}
              onAccept={() => onPoolAccept(reviewingProposal.id)}
              onReject={() => onPoolReject(reviewingProposal.id)}
            />
          )}

          {reviewingProposal && reviewingProposal.conflictsWith.length > 0 && (
            <ConflictWarningSection />
          )}

          {pendingProposals.length > 0 && (
            <PMVStack gap={2}>
              <PMText
                fontSize="xs"
                fontWeight="bold"
                color="secondary"
                textTransform="uppercase"
              >
                Pending ({pendingProposals.length})
              </PMText>
              {pendingProposals.map((proposal) => (
                <PendingProposalCard
                  key={proposal.id}
                  proposal={proposal}
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
                  onUndo={() => onUndoPool(proposal.id)}
                />
              ))}
            </CollapsiblePoolSection>
          )}

          {rejectedProposals.length > 0 && (
            <CollapsiblePoolSection
              label="Rejected"
              count={rejectedProposals.length}
              isOpen={showRejected}
              onToggle={() => setShowRejected((prev) => !prev)}
              colorPalette="red"
            >
              {rejectedProposals.map((proposal) => (
                <PoolProposalCard
                  key={proposal.id}
                  proposal={proposal}
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
  onAccept,
  onReject,
}: {
  proposal: ChangeProposalWithConflicts;
  userLookup: Map<UserId, string>;
  onAccept: () => void;
  onReject: () => void;
}) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';

  return (
    <PMVStack gap={2}>
      <PMText
        fontSize="xs"
        fontWeight="bold"
        color="secondary"
        textTransform="uppercase"
      >
        Reviewing
      </PMText>
      <PMBox
        borderRadius="md"
        border="1px solid"
        borderColor="border.primary"
        p={3}
        background="background.tertiary"
      >
        <PMVStack gap={2}>
          <PMHStack gap={2} justify="space-between" align="start">
            <PMVStack gap={1} flex={1}>
              <PMText fontSize="sm" fontWeight="bold">
                {getChangeProposalFieldLabel(proposal.type)}
              </PMText>
              <PMText fontSize="xs" color="secondary">
                By {authorEmail}
              </PMText>
              <PMText fontSize="xs" color="secondary">
                {formatDate(proposal.createdAt)}
              </PMText>
            </PMVStack>
            {proposal.conflictsWith.length > 0 && (
              <PMBadge colorPalette="orange" size="sm">
                <LuTriangleAlert size={12} />
                Outdated
              </PMBadge>
            )}
          </PMHStack>
          <PMHStack gap={2}>
            <PMButton size="sm" colorPalette="green" onClick={onAccept}>
              <LuCheck size={14} />
              Accept
            </PMButton>
            <PMButton
              size="sm"
              colorPalette="red"
              variant="outline"
              onClick={onReject}
            >
              <LuX size={14} />
              Reject
            </PMButton>
          </PMHStack>
        </PMVStack>
      </PMBox>
    </PMVStack>
  );
}

function ConflictWarningSection() {
  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
      p={3}
      background="background.secondary"
    >
      <PMHStack gap={2} align="center">
        <LuTriangleAlert size={16} color="var(--chakra-colors-orange-500)" />
        <PMText fontSize="xs" color="secondary">
          This proposal may conflict with the current version. Review carefully
          before accepting.
        </PMText>
      </PMHStack>
    </PMBox>
  );
}

function PendingProposalCard({
  proposal,
  onSelect,
  onAccept,
  onReject,
}: {
  proposal: ChangeProposalWithConflicts;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
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
        <PMText fontSize="sm" fontWeight="medium" flex={1}>
          {getChangeProposalFieldLabel(proposal.type)}
        </PMText>
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
  onUndo,
}: {
  proposal: ChangeProposalWithConflicts;
  onUndo: () => void;
}) {
  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor="border.tertiary"
      p={2}
      width="full"
    >
      <PMHStack gap={2} justify="space-between" align="center">
        <PMText fontSize="sm" color="secondary">
          {getChangeProposalFieldLabel(proposal.type)}
        </PMText>
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
