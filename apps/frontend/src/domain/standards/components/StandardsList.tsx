import * as React from 'react';
import { Link } from 'react-router';
import { PMLink, PMButton, PMAlertDialog, PMBadge } from '@packmind/ui';

import {
  useGetStandardsQuery,
  useDeleteStandardsBatchMutation,
} from '../api/queries/StandardsQueries';

import './StandardsList.styles.scss';
import { Standard, StandardId } from '@packmind/types';
import { STANDARD_MESSAGES } from '../constants/messages';
import { formatDistanceToNowStrict } from 'date-fns';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';
import { StandardSamplesModal } from './StandardSamplesModal';
import { StandardsBlankState } from './StandardsBlankState';
import { UserAvatarWithInitials } from '../../accounts/components/UserAvatarWithInitials';
import { PackageCountBadge } from '../../deployments/components/PackageCountBadge';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { getArtifactPackages } from '../../deployments/hooks/usePackagesForArtifact';
import { formatPackageNames } from '../../deployments/components/PackageCountBadge';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { SpacesManagementActions } from '@packmind/proprietary/frontend/domain/spaces-management/components/SpacesManagementActions';
import {
  ItemsListing,
  ItemsListingProps,
} from '../../../shared/components/ItemsListing';

interface StandardsListProps {
  orgSlug?: string;
  onEmptyStateChange?: (isEmpty: boolean) => void;
}

export const StandardsList = ({
  orgSlug,
  onEmptyStateChange,
}: StandardsListProps = {}) => {
  const { spaceSlug, spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();
  const {
    data: listStandardsResponse,
    isLoading,
    isError,
  } = useGetStandardsQuery();
  const deleteBatchMutation = useDeleteStandardsBatchMutation();
  const { data: packagesResponse } = useListPackagesBySpaceQuery(
    spaceId,
    organization?.id,
  );
  const { data: groupedProposals } = useGetGroupedChangeProposalsQuery();
  const pendingReviewCountByStandardId = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!groupedProposals) return map;
    for (const item of groupedProposals.standards) {
      map.set(item.artefactId, item.changeProposalCount);
    }
    return map;
  }, [groupedProposals]);

  // Alert state management for batch deployment
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSamplesModalOpen, setIsSamplesModalOpen] = React.useState(false);

  const handleBatchDelete = async (
    selectedStandardIds: StandardId[],
    unselectAll: () => void,
  ) => {
    if (selectedStandardIds.length === 0) return;

    try {
      const count = selectedStandardIds.length;
      await deleteBatchMutation.mutateAsync(selectedStandardIds);
      unselectAll();
      setDeleteAlert({
        type: 'success',
        message:
          count === 1
            ? STANDARD_MESSAGES.success.deleted
            : `${count} standards deleted successfully!`,
      });
      setDeleteModalOpen(false);

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete standards:', error);
      setDeleteAlert({
        type: 'error',
        message: STANDARD_MESSAGES.error.deleteFailed,
      });
      setDeleteModalOpen(false);
    }
  };

  const hasStandards = (listStandardsResponse?.standards ?? []).length > 0;

  React.useEffect(() => {
    if (onEmptyStateChange) {
      onEmptyStateChange(!hasStandards);
    }
  }, [hasStandards, onEmptyStateChange]);

  const listingProps: Omit<ItemsListingProps<Standard>, 'items'> = {
    sortItems: (items, sortKey, sortDirection) => {
      const packageNamesById =
        sortKey === 'packages'
          ? new Map(
              items.map((s) => [
                s.id,
                formatPackageNames(
                  getArtifactPackages(
                    packagesResponse?.packages,
                    s.id,
                    'standard',
                  ),
                ),
              ]),
            )
          : null;

      return items.sort((a, b) => {
        const direction = sortDirection === 'asc' ? 1 : -1;
        switch (sortKey) {
          case 'name':
            return direction * a.name.localeCompare(b.name);
          case 'updatedAt': {
            const dateA = new Date(a.updatedAt || 0).getTime();
            const dateB = new Date(b.updatedAt || 0).getTime();
            return direction * (dateA - dateB);
          }
          case 'createdBy': {
            const nameA = a.createdBy?.displayName ?? '';
            const nameB = b.createdBy?.displayName ?? '';
            return direction * nameA.localeCompare(nameB);
          }
          case 'version':
            return direction * ((a.version ?? 0) - (b.version ?? 0));
          case 'pendingReviews':
            return (
              direction *
              ((pendingReviewCountByStandardId.get(a.id) ?? 0) -
                (pendingReviewCountByStandardId.get(b.id) ?? 0))
            );
          case 'packages':
            return (
              direction *
              (packageNamesById?.get(a.id) ?? '').localeCompare(
                packageNamesById?.get(b.id) ?? '',
              )
            );
          default:
            return 0;
        }
      });
    },
    matchQuery(searchQuery, item) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    },
    columns: [
      {
        key: 'name',
        header: 'Name',
        grow: true,
        sortKey: 'name',
      },
      {
        key: 'createdBy',
        header: 'Created by',
        width: '200px',
        align: 'center',
        sortKey: 'createdBy',
      },
      {
        key: 'updatedAt',
        header: 'Last Updated',
        width: '250px',
        align: 'center',
        sortKey: 'updatedAt',
      },
      {
        key: 'version',
        header: 'Version',
        width: '100px',
        align: 'center',
        sortKey: 'version',
      },
      ...(groupedProposals
        ? [
            {
              key: 'pendingReviews',
              header: 'Pending reviews',
              width: '150px',
              align: 'center' as const,
              sortKey: 'pendingReviews',
            },
          ]
        : []),
      {
        key: 'packages',
        header: 'Packages',
        width: '220px',
        align: 'left',
        sortKey: 'packages',
      },
    ],
    batchActions: [
      ({ selectedIds, unselectAll }) => {
        return (
          <PMAlertDialog
            trigger={
              <PMButton
                variant="secondary"
                loading={deleteBatchMutation.isPending}
                size={'sm'}
                disabled={selectedIds.length === 0}
              >
                {`Delete (${selectedIds.length})`}
              </PMButton>
            }
            title="Delete Standards"
            message={STANDARD_MESSAGES.confirmation.deleteBatchStandards(
              selectedIds.length,
            )}
            confirmText="Delete"
            cancelText="Cancel"
            confirmColorScheme="red"
            onConfirm={() => handleBatchDelete(selectedIds, unselectAll)}
            open={deleteModalOpen}
            onOpenChange={(details) => setDeleteModalOpen(details.open)}
            isLoading={deleteBatchMutation.isPending}
          />
        );
      },
      ({ selectedIds, unselectAll }) => {
        return (
          <SpacesManagementActions
            artifactType="standard"
            selectedIds={selectedIds}
            isSomeSelected={selectedIds.length > 0}
            onSuccess={unselectAll}
          />
        );
      },
    ],
    makeTableData: (standard) => ({
      name: (
        <PMLink asChild>
          <Link
            to={
              orgSlug && spaceSlug
                ? routes.space.toStandard(orgSlug, spaceSlug, standard.id)
                : `#`
            }
          >
            {standard.name}
          </Link>
        </PMLink>
      ),
      createdBy: standard.createdBy ? (
        <UserAvatarWithInitials
          displayName={standard.createdBy.displayName}
          size="xs"
        />
      ) : (
        <span>-</span>
      ),
      updatedAt: (
        <>
          {formatDistanceToNowStrict(standard.updatedAt || new Date(), {
            addSuffix: true,
          })}
        </>
      ),
      version: standard.version,
      ...(groupedProposals
        ? {
            pendingReviews: (() => {
              const count =
                pendingReviewCountByStandardId.get(standard.id) ?? 0;
              if (count > 0 && orgSlug && spaceSlug) {
                return (
                  <PMLink asChild>
                    <Link
                      to={routes.space.toReviewChangesArtefact(
                        orgSlug,
                        spaceSlug,
                        'standards',
                        standard.id,
                      )}
                    >
                      <PMBadge colorPalette="yellow" variant="solid" size="sm">
                        {count}
                      </PMBadge>
                    </Link>
                  </PMLink>
                );
              }
              return (
                <PMBadge colorPalette="green" variant="solid" size="sm">
                  0
                </PMBadge>
              );
            })(),
            pendingReviewsCount:
              pendingReviewCountByStandardId.get(standard.id) ?? 0,
          }
        : {}),
      packages: (
        <PackageCountBadge
          artifactId={standard.id}
          artifactType="standard"
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
          spaceId={spaceId}
          organizationId={organization?.id}
        />
      ),
    }),
  };

  return (
    <div className={'standards-list'}>
      {isLoading && <p>Loading...</p>}
      {isError && <p>Error loading standards.</p>}
      {listStandardsResponse?.standards?.length ? (
        <ItemsListing
          items={listStandardsResponse.standards}
          {...listingProps}
        />
      ) : (
        <>
          {spaceSlug && (
            <StandardsBlankState
              orgSlug={orgSlug || ''}
              spaceSlug={spaceSlug}
              onBrowseTemplatesClick={() => setIsSamplesModalOpen(true)}
            />
          )}
          <StandardSamplesModal
            open={isSamplesModalOpen}
            onOpenChange={setIsSamplesModalOpen}
          />
        </>
      )}
    </div>
  );
};
