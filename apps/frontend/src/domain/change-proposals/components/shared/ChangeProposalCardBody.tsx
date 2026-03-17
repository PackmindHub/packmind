import { ReactNode, useCallback, useState } from 'react';
import {
  PMBadge,
  PMButton,
  PMHStack,
  PMInput,
  PMSeparator,
  PMText,
  PMTextArea,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuChevronDown, LuChevronUp, LuX } from 'react-icons/lu';
import { LuFolder, LuGitBranch, LuPackage } from 'react-icons/lu';
import { Collapsible, useCollapsibleContext } from '@chakra-ui/react';
import {
  ChangeProposalDecision,
  ChangeProposalType,
  PackageId,
  RemoveArtefactDecision,
  RemoveArtefactPayload,
  ScalarUpdatePayload,
  SpaceId,
  TargetId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { isMarkdownContent } from '../../utils/isMarkdownContent';
import {
  isEditableProposalType,
  isSingleLineProposalType,
} from '../../utils/editableProposalTypes';
import { ProposalMessage } from './ProposalMessage';
import { CardToolbar } from './CardToolbar';
import { FocusedView } from './FocusedView';
import { useAuthContext } from '../../../accounts/hooks';
import {
  useGetTargetsByOrganizationQuery,
  useListPackagesBySpaceQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';

const CollapsibleChevron = () => {
  const { open } = useCollapsibleContext();
  return open ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />;
};

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalCardBodyProps {
  proposal: ChangeProposalWithConflicts;
  viewMode: ViewMode;
  poolStatus: PoolStatus;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  showToolbar?: boolean;
  showEditButton?: boolean;
  decision?: ChangeProposalDecision | null;
  onViewModeChange: (mode: ViewMode) => void;
  onEdit: () => void;
  onAccept: (decision: ChangeProposalDecision) => void;
  onDismiss: () => void;
  onUndo: () => void;
  renderExpandedView?: (
    viewMode: ViewMode,
    proposal: ChangeProposalWithConflicts,
  ) => ReactNode;
}

function RemoveProposalContent({
  spaceId,
  targetId,
  packageIds,
  poolStatus,
  decision,
}: {
  spaceId: SpaceId;
  targetId: TargetId | undefined;
  packageIds: PackageId[];
  poolStatus: PoolStatus;
  decision: RemoveArtefactDecision | null;
}) {
  const { organization } = useAuthContext();
  const { data: packagesResponse } = useListPackagesBySpaceQuery(
    spaceId,
    organization?.id,
  );
  const { data: targets } = useGetTargetsByOrganizationQuery();

  const packageMap = new Map<PackageId, string>(
    packagesResponse?.packages?.map((pkg) => [pkg.id, pkg.name]) ?? [],
  );

  const target = targetId ? targets?.find((t) => t.id === targetId) : undefined;
  const repoLabel = target
    ? `${target.repository.owner}/${target.repository.repo}`
    : null;
  const targetPath = target && target.path !== '/' ? target.path : null;

  const removedPackageIds =
    poolStatus === 'accepted' && decision && !decision.delete
      ? decision.removeFromPackages
      : [];

  const distributedPackages = packageIds.map((id) => ({
    id,
    name: packageMap.get(id),
  }));

  return (
    <PMVStack align="stretch" gap={4}>
      <PMHStack gap={2} alignItems="center" flexWrap="wrap">
        <PMText fontSize="sm" color="secondary">
          Removed from repository
        </PMText>
        {repoLabel && (
          <PMBadge size="sm">
            <LuGitBranch />
            {repoLabel}
          </PMBadge>
        )}
        {targetPath && (
          <>
            <PMText fontSize="sm" color="secondary">
              in
            </PMText>
            <PMBadge size="sm" colorPalette="gray">
              <LuFolder />
              {targetPath}
            </PMBadge>
          </>
        )}
      </PMHStack>

      {removedPackageIds.length > 0 ? (
        <PMHStack gap={2} alignItems="center" flexWrap="wrap">
          <PMText fontSize="sm" color="secondary">
            Will be removed from packages
          </PMText>
          {removedPackageIds.map((id) => {
            const name = packageMap.get(id);
            return (
              <PMBadge key={id} size="sm" colorPalette={name ? 'red' : 'gray'}>
                <LuPackage />
                {name ?? 'Deleted package'}
              </PMBadge>
            );
          })}
        </PMHStack>
      ) : (
        <PMHStack gap={2} alignItems="center" flexWrap="wrap">
          <PMText fontSize="sm" color="secondary">
            Distributed in
          </PMText>
          {distributedPackages.map((pkg) => (
            <PMBadge key={pkg.id} size="sm" colorPalette="gray">
              <LuPackage />
              {pkg.name ?? 'Deleted package'}
            </PMBadge>
          ))}
        </PMHStack>
      )}
    </PMVStack>
  );
}

export function ChangeProposalCardBody({
  proposal,
  viewMode,
  poolStatus,
  isOutdated,
  isBlockedByConflict,
  showToolbar = true,
  showEditButton,
  decision,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  renderExpandedView,
}: Readonly<ChangeProposalCardBodyProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);
  const markdown = isMarkdownContent(proposal.type);
  const removePayload = proposal.payload as RemoveArtefactPayload;
  const packageIds = removePayload?.packageIds ?? [];
  const removeDecision = (decision ?? null) as RemoveArtefactDecision | null;

  const isRemoveType =
    proposal.type === ChangeProposalType.removeStandard ||
    proposal.type === ChangeProposalType.removeCommand ||
    proposal.type === ChangeProposalType.removeSkill;

  const editable = isEditableProposalType(proposal.type);
  const singleLine = isSingleLineProposalType(proposal.type);
  const isEdited =
    editable &&
    decision != null &&
    (decision as ScalarUpdatePayload).newValue !== newValue;
  const editedNewValue = isEdited
    ? (decision as ScalarUpdatePayload).newValue
    : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(newValue);
  const isEditValid = editedValue.trim().length > 0;

  const handleAccept = useCallback(
    (decision?: ChangeProposalDecision) => {
      const finalDecision =
        decision ??
        (!isRemoveType
          ? (proposal.payload as ChangeProposalDecision)
          : undefined);
      if (finalDecision !== undefined) {
        onAccept(finalDecision);
      }
    },
    [isRemoveType, proposal.payload, onAccept],
  );

  const handleEditToggle = useCallback(() => {
    setEditedValue(newValue);
    setIsEditing(true);
    onEdit();
  }, [newValue, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditedValue(newValue);
    setIsEditing(false);
  }, [newValue]);

  const handleAcceptEdit = useCallback(() => {
    const scalarPayload = proposal.payload as ScalarUpdatePayload;
    const editDecision: ScalarUpdatePayload = {
      oldValue: scalarPayload.oldValue,
      newValue: editedValue,
    };
    setIsEditing(false);
    onAccept(editDecision as ChangeProposalDecision);
  }, [proposal.payload, editedValue, onAccept]);

  const resolvedShowEditButton = showEditButton ?? editable;

  return (
    <PMVStack gap={0} alignItems="stretch">
      {showToolbar && !isEditing && (
        <>
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <CardToolbar
              poolStatus={poolStatus}
              proposalType={proposal.type}
              packageIds={packageIds}
              spaceId={proposal.spaceId}
              isOutdated={isOutdated}
              isBlockedByConflict={isBlockedByConflict}
              viewMode={viewMode}
              showEditButton={resolvedShowEditButton}
              onViewModeChange={onViewModeChange}
              onEdit={handleEditToggle}
              onAccept={handleAccept}
              onDismiss={onDismiss}
              onUndo={onUndo}
            />
          </PMVStack>
        </>
      )}

      {proposal.message && (
        <>
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <ProposalMessage message={proposal.message} />
          </PMVStack>
        </>
      )}

      <PMSeparator borderColor="border.tertiary" />
      <PMVStack p={4} alignItems="stretch">
        {isEditing ? (
          <PMVStack gap={3} alignItems="stretch">
            {singleLine ? (
              <PMInput
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                size="sm"
                autoFocus
              />
            ) : (
              <PMTextArea
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                size="sm"
                rows={10}
                autoFocus
              />
            )}
            <PMHStack gap={2} justifyContent="flex-end">
              <PMButton size="xs" variant="outline" onClick={handleCancelEdit}>
                <LuX />
                Cancel
              </PMButton>
              <PMButton
                size="xs"
                variant="outline"
                onClick={handleAcceptEdit}
                disabled={!isEditValid}
                color="green.300"
                borderColor="green.300"
                opacity={isEditValid ? 1 : 0.5}
              >
                <LuCheck />
                Save & Accept
              </PMButton>
            </PMHStack>
          </PMVStack>
        ) : isRemoveType ? (
          <RemoveProposalContent
            spaceId={proposal.spaceId}
            targetId={proposal.targetId}
            packageIds={packageIds}
            poolStatus={poolStatus}
            decision={removeDecision}
          />
        ) : isEdited ? (
          <PMVStack gap={4} alignItems="stretch">
            <Collapsible.Root>
              <Collapsible.Trigger
                cursor="pointer"
                width="full"
                textAlign="left"
              >
                <PMHStack gap={1} alignItems="center">
                  <PMText fontSize="xs" color="secondary" fontWeight="medium">
                    Original proposal
                  </PMText>
                  <CollapsibleChevron />
                </PMHStack>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <PMVStack gap={1} alignItems="stretch" opacity={0.6} pt={2}>
                  <FocusedView
                    oldValue={oldValue}
                    newValue={newValue}
                    isMarkdownContent={markdown}
                  />
                </PMVStack>
              </Collapsible.Content>
            </Collapsible.Root>
            <PMSeparator borderColor="border.tertiary" />
            <PMVStack gap={1} alignItems="stretch">
              <PMText fontSize="xs" color="secondary" fontWeight="medium">
                Edited
              </PMText>
              <FocusedView
                oldValue={oldValue}
                newValue={editedNewValue!}
                isMarkdownContent={markdown}
              />
            </PMVStack>
          </PMVStack>
        ) : !showToolbar && renderExpandedView ? (
          renderExpandedView(viewMode, proposal)
        ) : viewMode === 'focused' ? (
          (renderExpandedView?.(viewMode, proposal) ?? (
            <FocusedView
              oldValue={oldValue}
              newValue={newValue}
              isMarkdownContent={markdown}
            />
          ))
        ) : renderExpandedView ? (
          renderExpandedView(viewMode, proposal)
        ) : null}
      </PMVStack>
    </PMVStack>
  );
}
