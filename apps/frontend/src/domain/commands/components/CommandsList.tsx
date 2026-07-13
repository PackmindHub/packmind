import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMButton,
  PMTableRow,
  PMAlert,
  PMAlertDialog,
  PMBadge,
} from '@packmind/ui';

import {
  useGetCommandsQuery,
  useDeleteCommandsBatchMutation,
} from '../api/queries/CommandsQueries';

import './CommandsList.styles.scss';
import { CreatedBy, Command, CommandId, WithTimestamps } from '@packmind/types';
import { RECIPE_MESSAGES } from '../constants/messages';
import { formatDistanceToNowStrict } from 'date-fns';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';
import { CommandsBlankState } from './CommandsBlankState';
import { UserAvatarWithInitials } from '../../accounts/components/UserAvatarWithInitials';
import {
  PackageCountBadge,
  formatPackageNames,
} from '../../deployments/components/PackageCountBadge';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { getArtifactPackages } from '../../deployments/hooks/usePackagesForArtifact';
import { AddToPackagesBatchAction } from '../../deployments/components/AddToPackagesDialog';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { SpacesManagementActions } from '@packmind/proprietary/frontend/domain/spaces-management/components/SpacesManagementActions';
import {
  BatchAction,
  ItemsListing,
  ItemsListingProps,
} from '../../../shared/components/ItemsListing';

interface CommandsListProps {
  orgSlug: string;
  onEmptyStateChange?: (isEmpty: boolean) => void;
}

export const CommandsList = ({
  orgSlug,
  onEmptyStateChange,
}: CommandsListProps) => {
  const { organization } = useAuthContext();
  const { spaceSlug, spaceId } = useCurrentSpace();
  const { data: recipes, isLoading, isError } = useGetCommandsQuery();
  const deleteBatchMutation = useDeleteCommandsBatchMutation();
  const { data: packagesResponse } = useListPackagesBySpaceQuery(
    spaceId,
    organization?.id,
  );
  const { data: groupedProposals } = useGetGroupedChangeProposalsQuery();
  const pendingReviewCountByCommandId = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!groupedProposals) return map;
    for (const item of groupedProposals.commands) {
      map.set(item.artefactId, item.changeProposalCount);
    }
    return map;
  }, [groupedProposals]);

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleBatchDelete = async (
    selectedIds: CommandId[],
    unselectAll: () => void,
  ) => {
    if (!selectedIds.length || !organization?.id || !spaceId) return;

    try {
      const count = selectedIds.length;
      await deleteBatchMutation.mutateAsync({
        organizationId: organization.id,
        spaceId,
        commandIds: selectedIds,
      });
      unselectAll();
      setDeleteAlert({
        type: 'success',
        message:
          count === 1
            ? RECIPE_MESSAGES.success.deleted
            : `${count} recipes deleted successfully!`,
      });
      setDeleteDialogOpen(false);

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete recipes:', error);
      setDeleteAlert({
        type: 'error',
        message: RECIPE_MESSAGES.error.deleteFailed,
      });
      setDeleteDialogOpen(false);
    }
  };

  const renderAddToPackagesAction = React.useCallback<BatchAction<CommandId>>(
    ({ selectedIds, unselectAll }) => {
      if (!organization?.id || !spaceId) return null;
      return (
        <AddToPackagesBatchAction
          selectedIds={selectedIds}
          artifactType="recipe"
          artifactKindLabel="command"
          organizationId={organization.id}
          spaceId={spaceId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
          onSuccess={unselectAll}
        />
      );
    },
    [organization?.id, spaceId, orgSlug, spaceSlug],
  );

  const hasCommands = (recipes ?? []).length > 0;

  React.useEffect(() => {
    if (onEmptyStateChange) {
      onEmptyStateChange(!hasCommands);
    }
  }, [hasCommands, onEmptyStateChange]);

  const listingProps: Omit<
    ItemsListingProps<Command & { createdBy?: CreatedBy }>,
    'items'
  > = {
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
    makeTableData(recipe): PMTableRow {
      return {
        name: (
          <PMLink asChild>
            <Link
              to={
                spaceSlug
                  ? routes.space.toCommand(orgSlug, spaceSlug, recipe.id)
                  : '#'
              }
            >
              {recipe.name}
            </Link>
          </PMLink>
        ),
        createdBy: recipe.createdBy ? (
          <UserAvatarWithInitials
            displayName={recipe.createdBy.displayName}
            size="xs"
          />
        ) : (
          <span>-</span>
        ),
        updatedAt: (
          <>
            {formatDistanceToNowStrict(
              (recipe as WithTimestamps<Command>).updatedAt || new Date(),
              {
                addSuffix: true,
              },
            )}
          </>
        ),
        version: recipe.version,
        ...(groupedProposals
          ? {
              pendingReviews: (() => {
                const count = pendingReviewCountByCommandId.get(recipe.id) ?? 0;
                if (count > 0 && spaceSlug) {
                  return (
                    <PMLink asChild>
                      <Link
                        to={routes.space.toReviewChangesArtefact(
                          orgSlug,
                          spaceSlug,
                          'commands',
                          recipe.id,
                        )}
                      >
                        <PMBadge
                          colorPalette="yellow"
                          variant="solid"
                          size="sm"
                        >
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
                pendingReviewCountByCommandId.get(recipe.id) ?? 0,
            }
          : {}),
        packages: (
          <PackageCountBadge
            artifactId={recipe.id}
            artifactType="recipe"
            orgSlug={orgSlug}
            spaceSlug={spaceSlug}
            spaceId={spaceId}
            organizationId={organization?.id}
          />
        ),
      };
    },
    sortItems(items, sortKey, sortDirection) {
      const packageNamesById =
        sortKey === 'packages'
          ? new Map(
              items.map((r) => [
                r.id,
                formatPackageNames(
                  getArtifactPackages(
                    packagesResponse?.packages,
                    r.id,
                    'recipe',
                  ),
                ),
              ]),
            )
          : null;

      const direction = sortDirection === 'asc' ? 1 : -1;
      return items.sort((a, b) => {
        switch (sortKey) {
          case 'name':
            return direction * a.name.localeCompare(b.name);
          case 'updatedAt': {
            const dateA = new Date(
              (a as WithTimestamps<Command>).updatedAt || 0,
            ).getTime();
            const dateB = new Date(
              (b as WithTimestamps<Command>).updatedAt || 0,
            ).getTime();
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
              ((pendingReviewCountByCommandId.get(a.id) ?? 0) -
                (pendingReviewCountByCommandId.get(b.id) ?? 0))
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
    batchActions: [
      ({ selectedIds, unselectAll }) => (
        <PMAlertDialog
          trigger={
            <PMButton
              variant="secondary"
              loading={deleteBatchMutation.isPending}
              disabled={!selectedIds.length}
            >
              {`Delete (${selectedIds.length})`}
            </PMButton>
          }
          title="Delete Recipes"
          message={RECIPE_MESSAGES.confirmation.deleteBatchRecipes(
            selectedIds.length,
          )}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColorScheme="red"
          onConfirm={() => handleBatchDelete(selectedIds, unselectAll)}
          open={deleteDialogOpen}
          onOpenChange={({ open }) => setDeleteDialogOpen(open)}
          isLoading={deleteBatchMutation.isPending}
        />
      ),
      renderAddToPackagesAction,
      ({ selectedIds, unselectAll }) => (
        <SpacesManagementActions
          artifactType="command"
          selectedIds={selectedIds}
          isSomeSelected={selectedIds.length > 0}
          onSuccess={unselectAll}
        />
      ),
    ],
  };

  return (
    <div className={'recipes-list'}>
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      {isLoading && <p>Loading...</p>}
      {isError && <p>Error loading recipes.</p>}
      {recipes && recipes.length > 0 ? (
        <ItemsListing {...listingProps} items={recipes} />
      ) : (
        spaceSlug && (
          <CommandsBlankState orgSlug={orgSlug} spaceSlug={spaceSlug} />
        )
      )}
    </div>
  );
};
