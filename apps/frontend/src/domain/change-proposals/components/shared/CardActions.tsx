import React, { useEffect, useState } from 'react';
import {
  PMButton,
  PMButtonGroup,
  PMCheckbox,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMMenu,
  PMPortal,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  ChangeProposalDecision,
  ChangeProposalType,
  PackageId,
  RemoveArtefactDecision,
  SpaceId,
  getItemTypeFromChangeProposalType,
} from '@packmind/types';
import { LuCheck, LuChevronDown, LuPencil, LuUndo2, LuX } from 'react-icons/lu';
import { useAuthContext } from '../../../accounts/hooks';
import { useListPackagesBySpaceQuery } from '../../../deployments/api/queries/DeploymentsQueries';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface CardActionsProps {
  poolStatus: PoolStatus;
  proposalType: ChangeProposalType;
  packageIds: PackageId[];
  spaceId: SpaceId;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  showEditButton?: boolean;
  onEdit: () => void;
  onAccept: (decision?: ChangeProposalDecision) => void;
  onDismiss: () => void;
  onUndo: () => void;
}

function isRemoveProposal(type: ChangeProposalType): boolean {
  return (
    type === ChangeProposalType.removeStandard ||
    type === ChangeProposalType.removeCommand ||
    type === ChangeProposalType.removeSkill
  );
}

function RemoveFromPackagesModal({
  proposalType,
  packageIds,
  spaceId,
  onAccept,
  open,
  onOpenChange,
}: {
  proposalType: ChangeProposalType;
  packageIds: PackageId[];
  spaceId: SpaceId;
  onAccept: (decision: RemoveArtefactDecision) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { organization } = useAuthContext();
  const artefactType = getItemTypeFromChangeProposalType(proposalType);

  const { data: packagesResponse } = useListPackagesBySpaceQuery(
    spaceId,
    organization?.id,
  );

  const packageMap = new Map(
    packagesResponse?.packages?.map((pkg) => [pkg.id, pkg.name]) ?? [],
  );

  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<PackageId>>(
    new Set(),
  );

  useEffect(() => {
    if (open) setSelectedPackageIds(new Set());
  }, [open]);

  const handleCheckedChange = (packageId: PackageId, checked: boolean) => {
    setSelectedPackageIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(packageId);
      else next.delete(packageId);
      return next;
    });
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="center"
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Remove {artefactType}:</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMVStack align="flex-start" gap={4}>
                <PMText fontWeight="semibold">
                  Select from which packages the {artefactType} will be removed:
                </PMText>

                <PMVStack align="flex-start" gap={2}>
                  {packageIds.map((packageId) => (
                    <PMCheckbox
                      key={packageId}
                      checked={selectedPackageIds.has(packageId)}
                      onChange={(e) =>
                        handleCheckedChange(
                          packageId,
                          (e.target as HTMLInputElement).checked,
                        )
                      }
                    >
                      {packageMap.get(packageId) ?? 'Deleted package'}
                    </PMCheckbox>
                  ))}
                </PMVStack>
              </PMVStack>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButtonGroup size={'sm'}>
                <PMDialog.Trigger asChild>
                  <PMButton variant="outline" size="sm">
                    Cancel
                  </PMButton>
                </PMDialog.Trigger>
                <PMButton
                  size="sm"
                  colorPalette="blue"
                  disabled={selectedPackageIds.size === 0}
                  onClick={() =>
                    onAccept({
                      delete: false,
                      removeFromPackages: [...selectedPackageIds],
                    })
                  }
                >
                  Accept
                </PMButton>
              </PMButtonGroup>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
}

function ResolveButton({
  proposalType,
  packageIds,
  spaceId,
  isOutdated,
  onDismiss,
  onAccept,
}: {
  proposalType: ChangeProposalType;
  packageIds: PackageId[];
  spaceId: SpaceId;
  isOutdated: boolean;
  onDismiss: () => void;
  onAccept: (decision: RemoveArtefactDecision) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const menu = (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMButton size="xs" variant="outline" disabled={isOutdated}>
          Resolve <LuChevronDown size={12} />
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="dismiss" cursor="pointer" onClick={onDismiss}>
              Dismiss
            </PMMenu.Item>
            <PMMenu.Separator borderColor={'border.tertiary'} />
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
  );

  return (
    <PMHStack gap={2}>
      {isOutdated ? (
        <PMTooltip label="This proposal is based on an outdated version">
          {menu}
        </PMTooltip>
      ) : (
        menu
      )}
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
        proposalType={proposalType}
        packageIds={packageIds}
        spaceId={spaceId}
        onAccept={onAccept}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </PMHStack>
  );
}

export function CardActions({
  poolStatus,
  proposalType,
  packageIds,
  spaceId,
  isOutdated,
  isBlockedByConflict,
  showEditButton = true,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
}: Readonly<CardActionsProps>) {
  if (poolStatus !== 'pending') {
    return (
      <PMButton size="sm" variant="ghost" onClick={onUndo}>
        <LuUndo2 />
        Undo
      </PMButton>
    );
  }

  if (isRemoveProposal(proposalType)) {
    return (
      <ResolveButton
        proposalType={proposalType}
        packageIds={packageIds}
        spaceId={spaceId}
        isOutdated={isOutdated}
        onDismiss={onDismiss}
        onAccept={(decision) => onAccept(decision)}
      />
    );
  }

  const acceptDisabled = isOutdated || isBlockedByConflict;
  const acceptTooltip = isOutdated
    ? 'This proposal is outdated and cannot be accepted'
    : isBlockedByConflict
      ? 'A conflicting proposal has already been accepted'
      : undefined;

  const acceptButton = (
    <PMButton
      size="xs"
      variant="outline"
      disabled={acceptDisabled}
      onClick={() => onAccept()}
      color="green.300"
      borderColor="green.300"
    >
      <LuCheck />
      Accept
    </PMButton>
  );

  return (
    <PMHStack gap={2}>
      {showEditButton && (
        <PMButton size="xs" variant="outline" onClick={onEdit}>
          <LuPencil />
          Edit
        </PMButton>
      )}
      {acceptTooltip ? (
        <PMTooltip label={acceptTooltip}>{acceptButton}</PMTooltip>
      ) : (
        acceptButton
      )}
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
    </PMHStack>
  );
}
