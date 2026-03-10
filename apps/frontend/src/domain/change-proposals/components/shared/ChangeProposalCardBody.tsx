import { ReactNode, useCallback } from 'react';
import { PMSeparator, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalDecision,
  ChangeProposalType,
  PackageId,
  RemoveArtefactDecision,
  RemoveArtefactPayload,
  SpaceId,
  TargetId,
  getItemTypeFromChangeProposalType,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { isMarkdownContent } from '../../utils/isMarkdownContent';
import { ProposalMessage } from './ProposalMessage';
import { CardToolbar } from './CardToolbar';
import { FocusedView } from './FocusedView';
import { useAuthContext } from '../../../accounts/hooks';
import {
  useGetTargetsByOrganizationQuery,
  useListPackagesBySpaceQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';

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
  proposalType,
  spaceId,
  targetId,
  poolStatus,
  decision,
}: {
  proposalType: ChangeProposalType;
  spaceId: SpaceId;
  targetId: TargetId;
  poolStatus: PoolStatus;
  decision: RemoveArtefactDecision | null;
}) {
  const { organization } = useAuthContext();
  const { data: packagesResponse } = useListPackagesBySpaceQuery(
    spaceId,
    organization?.id,
  );
  const { data: targets } = useGetTargetsByOrganizationQuery();

  const itemType = getItemTypeFromChangeProposalType(proposalType);
  const artefactLabel = itemType.charAt(0).toUpperCase() + itemType.slice(1);

  const packageMap = new Map<PackageId, string>(
    packagesResponse?.packages?.map((pkg) => [pkg.id, pkg.name]) ?? [],
  );

  const target = targets?.find((t) => t.id === targetId);
  const targetPathLabel =
    target && target.path !== '/' ? ` in folder ${target.path}` : '';
  const repoLabel = target
    ? `${target.repository.owner}/${target.repository.repo}${targetPathLabel}`
    : null;

  const removedPackageIds =
    poolStatus === 'accepted' && decision && !decision.delete
      ? decision.removeFromPackages
      : [];

  return (
    <PMVStack align="flex-start" gap={3}>
      <PMText fontSize="sm" color="secondary">
        {artefactLabel} has been removed from repository
        {repoLabel ? ` ${repoLabel}` : ''}
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

  return (
    <PMVStack gap={0} alignItems="stretch">
      {showToolbar && (
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
              showEditButton={showEditButton}
              onViewModeChange={onViewModeChange}
              onEdit={onEdit}
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
        {isRemoveType ? (
          <RemoveProposalContent
            proposalType={proposal.type}
            spaceId={proposal.spaceId}
            targetId={removePayload.targetId}
            poolStatus={poolStatus}
            decision={removeDecision}
          />
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
