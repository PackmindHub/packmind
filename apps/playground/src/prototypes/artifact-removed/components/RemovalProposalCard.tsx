import { useState } from 'react';
import {
  PMAccordion,
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMMenu,
  PMPortal,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronDown, LuUndo2, LuX } from 'react-icons/lu';
import {
  ARTEFACT_TYPE_LABEL,
  PoolStatus,
  RemoveArtefactDecision,
  StubPackage,
  StubRemovalProposal,
} from '../types';
import { RemoveFromPackagesModal } from './RemoveFromPackagesModal';

const STATUS_DOT_COLOR: Record<PoolStatus, string> = {
  pending: 'yellow.400',
  accepted: 'green.400',
  dismissed: 'red.400',
};

function StatusDot({ status }: { status: PoolStatus }) {
  return (
    <PMBox
      width="10px"
      height="10px"
      borderRadius="full"
      flexShrink={0}
      bg={STATUS_DOT_COLOR[status]}
    />
  );
}

function RemoveProposalContent({
  proposal,
  packages,
}: {
  proposal: StubRemovalProposal;
  packages: StubPackage[];
}) {
  const artefactLabel = ARTEFACT_TYPE_LABEL[proposal.artefactType];

  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg.name]));

  const removedPackageIds =
    proposal.poolStatus === 'accepted' &&
    proposal.decision &&
    !proposal.decision.delete
      ? proposal.decision.removeFromPackages
      : [];

  return (
    <PMVStack align="flex-start" gap={3}>
      <PMText fontSize="sm" color="secondary">
        {artefactLabel} has been removed from repository
      </PMText>
      {removedPackageIds.length > 0 && (
        <PMText fontSize="sm" color="secondary">
          {artefactLabel} will be removed from the following packages:{' '}
          {removedPackageIds
            .map((packageId) => packageMap.get(packageId) ?? packageId)
            .join(', ')}
        </PMText>
      )}
    </PMVStack>
  );
}

function ResolveActions({
  proposal,
  packages,
  onDismiss,
  onAccept,
}: {
  proposal: StubRemovalProposal;
  packages: StubPackage[];
  onDismiss: () => void;
  onAccept: (decision: RemoveArtefactDecision) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <PMHStack gap={2}>
      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          <PMButton size="xs" variant="outline">
            Resolve <LuChevronDown size={12} />
          </PMButton>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content>
              <PMMenu.Item value="dismiss" cursor="pointer" onClick={onDismiss}>
                Dismiss
              </PMMenu.Item>
              <PMMenu.Separator borderColor="border.tertiary" />
              <PMMenu.Item
                value="remove-from-packages"
                cursor="pointer"
                onClick={() => setIsModalOpen(true)}
              >
                Remove from packages...
              </PMMenu.Item>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      <PMButton
        size="xs"
        variant="outline"
        onClick={onDismiss}
        color="red.300"
        borderColor="red.300"
      >
        <LuX />
        Dismiss
      </PMButton>
      <RemoveFromPackagesModal
        artefactType={proposal.artefactType}
        packages={packages.filter((pkg) =>
          proposal.packageIds.includes(pkg.id),
        )}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onAccept={onAccept}
      />
    </PMHStack>
  );
}

function CardActions({
  proposal,
  packages,
  onAccept,
  onDismiss,
  onUndo,
}: {
  proposal: StubRemovalProposal;
  packages: StubPackage[];
  onAccept: (decision: RemoveArtefactDecision) => void;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  if (proposal.poolStatus !== 'pending') {
    return (
      <PMButton size="sm" variant="ghost" onClick={onUndo}>
        <LuUndo2 />
        Undo
      </PMButton>
    );
  }

  return (
    <ResolveActions
      proposal={proposal}
      packages={packages}
      onDismiss={onDismiss}
      onAccept={onAccept}
    />
  );
}

interface RemovalProposalCardProps {
  proposal: StubRemovalProposal;
  packages: StubPackage[];
  onAccept: (decision: RemoveArtefactDecision) => void;
  onDismiss: () => void;
  onUndo: () => void;
}

export function RemovalProposalCard({
  proposal,
  packages,
  onAccept,
  onDismiss,
  onUndo,
}: RemovalProposalCardProps) {
  return (
    <PMAccordion.Item
      value={proposal.id}
      border="1px solid"
      borderColor="border.tertiary"
      borderRadius="md"
      width="full"
    >
      {/* Card header */}
      <PMAccordion.ItemTrigger px={4} py={3} _hover={{ cursor: 'pointer' }}>
        <PMHStack flex={1} gap={3} alignItems="center">
          <PMAccordion.ItemIndicator />
          <PMText fontWeight="medium" fontSize="sm">
            #{proposal.number} &mdash; Removed
          </PMText>
          <StatusDot status={proposal.poolStatus} />
          <PMHStack flex={1} justifyContent="flex-end">
            <PMText fontSize="xs" color="secondary">
              {proposal.author} &middot; {proposal.createdAt} &middot;
            </PMText>
            <PMBadge size="sm" colorPalette="gray">
              {ARTEFACT_TYPE_LABEL[proposal.artefactType]}
            </PMBadge>
          </PMHStack>
        </PMHStack>
      </PMAccordion.ItemTrigger>

      {/* Card body */}
      <PMAccordion.ItemContent>
        <PMVStack gap={0} alignItems="stretch">
          {/* Toolbar — no view mode selector for removals, just actions */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <PMHStack justifyContent="space-between" alignItems="center">
              {/* Empty div to push actions to the right, matching the production UI */}
              <div />
              <CardActions
                proposal={proposal}
                packages={packages}
                onAccept={onAccept}
                onDismiss={onDismiss}
                onUndo={onUndo}
              />
            </PMHStack>
          </PMVStack>

          {/* Message (if present) */}
          {proposal.message && (
            <>
              <PMSeparator borderColor="border.tertiary" />
              <PMVStack p={4} alignItems="stretch">
                <PMText fontSize="sm" fontStyle="italic" color="secondary">
                  {proposal.message}
                </PMText>
              </PMVStack>
            </>
          )}

          {/* Remove proposal content */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <RemoveProposalContent proposal={proposal} packages={packages} />
          </PMVStack>
        </PMVStack>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
