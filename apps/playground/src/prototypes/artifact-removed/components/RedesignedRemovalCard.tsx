import { useState } from 'react';
import {
  PMAccordion,
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuChevronDown,
  LuFolder,
  LuGitBranch,
  LuPackage,
  LuTrash2,
  LuUndo2,
  LuX,
} from 'react-icons/lu';
import {
  ARTEFACT_TYPE_LABEL,
  PoolStatus,
  RemoveArtefactDecision,
  StubPackage,
  StubRemovalProposal,
  StubRepository,
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

function ContextInfo({
  proposal,
  packages,
  repositories,
}: {
  proposal: StubRemovalProposal;
  packages: StubPackage[];
  repositories: StubRepository[];
}) {
  const repository = repositories.find((r) => r.id === proposal.repositoryId);
  const targetPackages = packages.filter((pkg) =>
    proposal.packageIds.includes(pkg.id),
  );

  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg.name]));

  const removedPackageIds =
    proposal.poolStatus === 'accepted' &&
    proposal.decision &&
    !proposal.decision.delete
      ? proposal.decision.removeFromPackages
      : [];

  return (
    <PMVStack align="stretch" gap={4}>
      {/* Repository info */}
      <PMHStack gap={2} alignItems="center" flexWrap="wrap">
        <PMText fontSize="sm" color="secondary">
          Removed from repository
        </PMText>
        <PMBadge size="sm">
          <LuGitBranch />
          {repository?.name ?? proposal.repositoryId}
        </PMBadge>
        {proposal.targetPath && (
          <>
            <PMText fontSize="sm" color="secondary">
              in
            </PMText>
            <PMBadge size="sm" colorPalette="gray">
              <LuFolder />
              {proposal.targetPath}
            </PMBadge>
          </>
        )}
      </PMHStack>

      {/* Target packages */}
      {removedPackageIds.length > 0 ? (
        <PMHStack gap={2} alignItems="center" flexWrap="wrap">
          <PMText fontSize="sm" color="secondary">
            Will be removed from packages
          </PMText>
          {removedPackageIds.map((id) => (
            <PMBadge key={id} size="sm" colorPalette="red">
              <LuPackage />
              {packageMap.get(id) ?? id}
            </PMBadge>
          ))}
        </PMHStack>
      ) : (
        <PMHStack gap={2} alignItems="center" flexWrap="wrap">
          <PMText fontSize="sm" color="secondary">
            Distributed in
          </PMText>
          {targetPackages.map((pkg) => (
            <PMBadge key={pkg.id} size="sm" colorPalette="gray">
              <LuPackage />
              {pkg.name}
            </PMBadge>
          ))}
        </PMHStack>
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

interface RedesignedRemovalCardProps {
  proposal: StubRemovalProposal;
  packages: StubPackage[];
  repositories: StubRepository[];
  onAccept: (decision: RemoveArtefactDecision) => void;
  onDismiss: () => void;
  onUndo: () => void;
}

export function RedesignedRemovalCard({
  proposal,
  packages,
  repositories,
  onAccept,
  onDismiss,
  onUndo,
}: RedesignedRemovalCardProps) {
  return (
    <PMAccordion.Item
      value={proposal.id}
      border="1px solid"
      borderColor="red.800"
      borderRadius="md"
      width="full"
    >
      {/* Card header */}
      <PMAccordion.ItemTrigger
        px={4}
        py={3}
        _hover={{ cursor: 'pointer' }}
        bg="red.950/30"
      >
        <PMHStack flex={1} gap={3} alignItems="center">
          <PMAccordion.ItemIndicator />
          <PMIcon color="red.400" fontSize="md">
            <LuTrash2 />
          </PMIcon>
          <PMText fontWeight="medium" fontSize="sm">
            #{proposal.number} &mdash;{' '}
            <PMText as="span" color="red.300">
              Removed
            </PMText>
          </PMText>
          <StatusDot status={proposal.poolStatus} />
          <PMHStack flex={1} justifyContent="flex-end">
            <PMText fontSize="xs" color="secondary">
              {proposal.author} &middot; {proposal.createdAt} &middot;
            </PMText>
            <PMBadge size="sm" colorPalette="red" variant="subtle">
              {ARTEFACT_TYPE_LABEL[proposal.artefactType]}
            </PMBadge>
          </PMHStack>
        </PMHStack>
      </PMAccordion.ItemTrigger>

      {/* Card body */}
      <PMAccordion.ItemContent>
        <PMVStack gap={0} alignItems="stretch">
          {/* Toolbar — same layout as current UI */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <PMHStack justifyContent="space-between" alignItems="center">
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

          {/* Context: repository + target packages */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <ContextInfo
              proposal={proposal}
              packages={packages}
              repositories={repositories}
            />
          </PMVStack>
        </PMVStack>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
