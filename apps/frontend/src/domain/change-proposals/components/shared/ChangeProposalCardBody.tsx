import { ReactNode, useCallback } from 'react';
import { PMBadge, PMHStack, PMSeparator, PMText, PMVStack } from '@packmind/ui';
import { LuFolder, LuGitBranch, LuPackage } from 'react-icons/lu';
import {
  ChangeProposalDecision,
  ChangeProposalType,
  PackageId,
  RemoveArtefactDecision,
  RemoveArtefactPayload,
  SpaceId,
  TargetId,
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
            spaceId={proposal.spaceId}
            targetId={proposal.targetId}
            packageIds={packageIds}
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
