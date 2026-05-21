import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMButton,
  PMTableRow,
  PMAlertDialog,
  PMAlert,
  PMTooltip,
  PMText,
  PMTable,
} from '@packmind/ui';
import { Package, PackageId } from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  useListPackagesBySpaceQuery,
  useDeletePackagesBatchMutation,
} from '../../api/queries/DeploymentsQueries';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { routes } from '../../../../shared/utils/routes';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import { DeployPackageButton } from '../PackageDeployments/DeployPackageButton';
import { PackagesBlankState } from '../PackagesBlankState';
import {
  ItemsListing,
  ItemsListingProps,
} from '../../../../shared/components/ItemsListing';

export interface PackagesPageProps {
  spaceSlug: string;
  orgSlug: string;
  onEmptyStateChange?: (isEmpty: boolean) => void;
}

export const PackagesPage: React.FC<PackagesPageProps> = ({
  spaceSlug,
  orgSlug,
  onEmptyStateChange,
}) => {
  const { spaceId, space, isLoading: isLoadingSpace } = useCurrentSpace();
  const organizationId = space?.organizationId;

  const {
    data: packagesResponse,
    isLoading: isLoadingPackages,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  const deleteBatchMutation = useDeletePackagesBatchMutation();

  const { data: providersResponse } = useGetGitProvidersQuery();
  const hasGitProviderWithToken =
    providersResponse?.providers?.some((p) => p.hasToken) ?? false;

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const packages = packagesResponse?.packages ?? [];
  const hasPackages = packages.length > 0;

  React.useEffect(() => {
    if (onEmptyStateChange) {
      onEmptyStateChange(!hasPackages);
    }
  }, [hasPackages, onEmptyStateChange]);

  const handleBatchDelete = async (
    selectedIds: PackageId[],
    unselectAll: () => void,
  ) => {
    if (!selectedIds.length || !organizationId || !spaceId) return;

    try {
      const count = selectedIds.length;
      await deleteBatchMutation.mutateAsync({
        organizationId,
        spaceId,
        packageIds: selectedIds,
      });
      unselectAll();
      setDeleteAlert({
        type: 'success',
        message:
          count === 1
            ? PACKAGE_MESSAGES.success.deleted
            : `${count} packages deleted successfully!`,
      });
      setDeleteDialogOpen(false);

      setTimeout(() => setDeleteAlert(null), 3000);
    } catch (error) {
      console.error('Failed to delete packages:', error);
      setDeleteAlert({
        type: 'error',
        message: PACKAGE_MESSAGES.error.deleteFailed,
      });
      setDeleteDialogOpen(false);
    }
  };

  const listingProps: Omit<ItemsListingProps<Package>, 'items'> = {
    columns: [
      {
        key: 'name',
        header: 'Name',
        grow: true,
        sortKey: 'name',
      },
      {
        key: 'artifacts',
        header: 'Artifacts',
        width: '100px',
        align: 'center',
        sortKey: 'artifacts',
      },
    ],
    makeTableData(pkg): PMTableRow {
      const commandsCount = pkg.recipes?.length || 0;
      const standardsCount = pkg.standards?.length || 0;
      const skillsCount = pkg.skills?.length || 0;
      const totalCount = commandsCount + standardsCount + skillsCount;

      const tooltipContent = (
        <PMTable
          columns={[
            { key: 'type', header: 'Type', width: '120px' },
            { key: 'count', header: 'Count', width: '80px', align: 'right' },
          ]}
          data={[
            {
              key: 'commands',
              type: <PMText variant="body">Commands</PMText>,
              count: <PMText variant="body">{commandsCount}</PMText>,
            },
            {
              key: 'standards',
              type: <PMText variant="body">Standards</PMText>,
              count: <PMText variant="body">{standardsCount}</PMText>,
            },
            {
              key: 'skills',
              type: <PMText variant="body">Skills</PMText>,
              count: <PMText variant="body">{skillsCount}</PMText>,
            },
          ]}
          size="sm"
          variant="line"
        />
      );

      return {
        name: (
          <PMLink asChild>
            <Link to={routes.space.toPackage(orgSlug, spaceSlug, pkg.id)}>
              {pkg.name}
            </Link>
          </PMLink>
        ),
        artifacts: (
          <PMTooltip label={tooltipContent} placement="top">
            <PMBox as="span">{totalCount}</PMBox>
          </PMTooltip>
        ),
        artifactsCount: totalCount,
      };
    },
    sortItems(items, sortKey, sortDirection) {
      const direction = sortDirection === 'asc' ? 1 : -1;
      return items.sort((a, b) => {
        switch (sortKey) {
          case 'name':
            return direction * a.name.localeCompare(b.name);
          case 'artifacts': {
            const totalA =
              (a.recipes?.length || 0) +
              (a.standards?.length || 0) +
              (a.skills?.length || 0);
            const totalB =
              (b.recipes?.length || 0) +
              (b.standards?.length || 0) +
              (b.skills?.length || 0);
            return direction * (totalA - totalB);
          }
          default:
            return 0;
        }
      });
    },
    batchActions: [
      ({ selectedIds }) => {
        if (!hasGitProviderWithToken) return null;
        const selectedPackages = packages.filter((pkg) =>
          selectedIds.includes(pkg.id),
        );
        return (
          <DeployPackageButton
            selectedPackages={selectedPackages}
            variant="primary"
            disabled={selectedPackages.length === 0}
          />
        );
      },
      ({ selectedIds, unselectAll }) => (
        <PMAlertDialog
          trigger={
            <PMButton
              variant="tertiary"
              loading={deleteBatchMutation.isPending}
              disabled={!selectedIds.length}
            >
              {`Delete (${selectedIds.length})`}
            </PMButton>
          }
          title="Delete Packages"
          message={PACKAGE_MESSAGES.confirmation.deleteBatchPackages(
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
    ],
  };

  const isLoading = isLoadingSpace || isLoadingPackages;

  return (
    <>
      {isLoading && <p>Loading...</p>}
      {isError && <p>Error loading packages.</p>}
      {deleteAlert && (
        <PMAlert.Root status={deleteAlert.type} mb={4}>
          <PMAlert.Content>
            <PMAlert.Title>
              {deleteAlert.type === 'success' ? 'Success' : 'Error'}
            </PMAlert.Title>
            <PMAlert.Description>{deleteAlert.message}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}
      {hasPackages ? (
        <ItemsListing {...listingProps} items={packages} />
      ) : (
        <PackagesBlankState orgSlug={orgSlug} spaceSlug={spaceSlug} />
      )}
    </>
  );
};
