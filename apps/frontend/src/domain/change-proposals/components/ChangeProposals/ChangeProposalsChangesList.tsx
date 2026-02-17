import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMIconButton,
  PMText,
  PMTooltip,
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
  LuCircleAlert,
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
              currentArtefactVersion={currentArtefactVersion}
            />
          )}

          {reviewingProposal && reviewingProposal.conflictsWith.length > 0 && (
            <ConflictWithSection
              reviewingProposal={reviewingProposal}
              proposals={proposals}
              userLookup={userLookup}
              currentArtefactVersion={currentArtefactVersion}
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
                  userLookup={userLookup}
                  currentArtefactVersion={currentArtefactVersion}
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
                  currentArtefactVersion={currentArtefactVersion}
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
  currentArtefactVersion,
}: {
  proposal: ChangeProposalWithConflicts;
  userLookup: Map<UserId, string>;
  currentArtefactVersion?: number;
}) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';
  const statusBadge = getStatusBadgeProps(proposal.status);
  const isOutdated =
    currentArtefactVersion !== undefined &&
    proposal.artefactVersion !== currentArtefactVersion;

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
  currentArtefactVersion,
  onSelectProposal,
}: {
  reviewingProposal: ChangeProposalWithConflicts;
  proposals: ChangeProposalWithConflicts[];
  userLookup: Map<UserId, string>;
  currentArtefactVersion?: number;
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
      {conflictingProposals.map((proposal) => {
        const statusBadge = getStatusBadgeProps(proposal.status);
        const authorEmail =
          userLookup.get(proposal.createdBy) ?? 'Unknown user';
        const isOutdated =
          currentArtefactVersion !== undefined &&
          proposal.artefactVersion !== currentArtefactVersion;

        return (
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
            <PMVStack
              gap={2}
              flex={1}
              alignItems="flex-start"
              justifyContent="center"
            >
              <PMHStack
                gap={2}
                justify="space-between"
                align="center"
                width="full"
              >
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
        );
      })}
    </PMVStack>
  );
}

function PendingProposalCard({
  proposal,
  userLookup,
  currentArtefactVersion,
  onSelect,
  onAccept,
  onReject,
}: {
  proposal: ChangeProposalWithConflicts;
  userLookup: Map<UserId, string>;
  currentArtefactVersion?: number;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';
  const statusBadge = getStatusBadgeProps(proposal.status);
  const isOutdated =
    currentArtefactVersion !== undefined &&
    proposal.artefactVersion !== currentArtefactVersion;

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
      <PMHStack gap={2} justify="space-between" align="flex-start">
        <PMVStack
          gap={2}
          flex={1}
          alignItems="flex-start"
          justifyContent="center"
        >
          <PMHStack gap={2} justify="space-between" align="center" width="full">
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
        <PMHStack gap={1}>
          <PMIconButton
            aria-label="Accept proposal"
            size="xs"
            variant="ghost"
            disabled={isOutdated}
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
  currentArtefactVersion,
  onUndo,
}: {
  proposal: ChangeProposalWithConflicts;
  userLookup: Map<UserId, string>;
  currentArtefactVersion?: number;
  onUndo: () => void;
}) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';
  const statusBadge = getStatusBadgeProps(proposal.status);
  const isOutdated =
    currentArtefactVersion !== undefined &&
    proposal.artefactVersion !== currentArtefactVersion;

  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor="border.tertiary"
      p={2}
      width="full"
    >
      <PMHStack gap={2} justify="space-between" align="flex-start">
        <PMVStack
          gap={2}
          flex={1}
          alignItems="flex-start"
          justifyContent="center"
        >
          <PMHStack gap={2} justify="space-between" align="center" width="full">
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
