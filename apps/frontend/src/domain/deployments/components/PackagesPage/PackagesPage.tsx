import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMCheckbox,
  PMAlertDialog,
  PMButtonGroup,
  PMAlert,
  PMInput,
  PMTooltip,
  PMText,
  useTableSort,
} from '@packmind/ui';
import { PackageId } from '@packmind/types';
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

  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = React.useState<
    PackageId[]
  >([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { sortKey, sortDirection, handleSort, getSortDirection } = useTableSort(
    {
      defaultSortKey: 'name',
      defaultSortDirection: 'asc',
    },
  );

  const packages = packagesResponse?.packages ?? [];
  const isSomeSelected = selectedPackageIds.length > 0;
  const isAllSelected =
    packages.length > 0 && selectedPackageIds.length === packages.length;

  const selectedPackages = packages.filter((pkg) =>
    selectedPackageIds.includes(pkg.id),
  );

  const handleSelectPackage = (packageId: PackageId, isChecked: boolean) => {
    if (isChecked) {
      setSelectedPackageIds((prev) =>
        prev.includes(packageId) ? prev : [...prev, packageId],
      );
    } else {
      setSelectedPackageIds((prev) => prev.filter((id) => id !== packageId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked && packages) {
      setSelectedPackageIds(packages.map((p) => p.id));
    } else {
      setSelectedPackageIds([]);
    }
  };

  const handleBatchDelete = async () => {
    if (!isSomeSelected || !organizationId || !spaceId) return;

    try {
      const count = selectedPackageIds.length;
      await deleteBatchMutation.mutateAsync({
        organizationId,
        spaceId,
        packageIds: selectedPackageIds,
      });
      setSelectedPackageIds([]);
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

  React.useEffect(() => {
    if (!packagesResponse) return;

    const filteredPackages = packagesResponse.packages.filter((pkg) =>
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const sortedPackages = [...filteredPackages].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
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

    setTableData(
      sortedPackages.map((pkg) => {
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
          key: pkg.id,
          select: (
            <PMCheckbox
              checked={selectedPackageIds.includes(pkg.id)}
              onCheckedChange={(e) => {
                handleSelectPackage(pkg.id, e.checked === true);
              }}
            />
          ),
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
        };
      }),
    );
  }, [
    packagesResponse,
    orgSlug,
    spaceSlug,
    selectedPackageIds,
    sortKey,
    sortDirection,
    searchQuery,
  ]);

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected || false}
          onCheckedChange={() => handleSelectAll(!isAllSelected)}
          controlProps={{ borderColor: 'border.checkbox' }}
        />
      ),
      width: '50px',
      align: 'center',
    },
    {
      key: 'name',
      header: 'Name',
      grow: true,
      sortable: true,
      sortDirection: getSortDirection('name'),
    },
    {
      key: 'artifacts',
      header: 'Artifacts',
      width: '100px',
      align: 'center',
      sortable: true,
      sortDirection: getSortDirection('artifacts'),
    },
  ];

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
      {(packagesResponse?.packages ?? []).length ? (
        <>
          {onEmptyStateChange && onEmptyStateChange(false)}
          <PMBox>
            <PMBox mb={4}>
              <PMInput
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </PMBox>
            <PMBox mb={4}>
              <PMButtonGroup>
                {hasGitProviderWithToken && (
                  <DeployPackageButton
                    selectedPackages={selectedPackages}
                    variant="primary"
                    disabled={selectedPackages.length === 0}
                  />
                )}
                <PMAlertDialog
                  trigger={
                    <PMButton
                      variant="tertiary"
                      loading={deleteBatchMutation.isPending}
                      disabled={!isSomeSelected}
                    >
                      {`Delete (${selectedPackageIds.length})`}
                    </PMButton>
                  }
                  title="Delete Packages"
                  message={PACKAGE_MESSAGES.confirmation.deleteBatchPackages(
                    selectedPackageIds.length,
                  )}
                  confirmText="Delete"
                  cancelText="Cancel"
                  confirmColorScheme="red"
                  onConfirm={handleBatchDelete}
                  open={deleteDialogOpen}
                  onOpenChange={({ open }) => setDeleteDialogOpen(open)}
                  isLoading={deleteBatchMutation.isPending}
                />
                <PMButton
                  variant="secondary"
                  onClick={() => setSelectedPackageIds([])}
                  disabled={!isSomeSelected}
                >
                  Clear Selection
                </PMButton>
              </PMButtonGroup>
            </PMBox>
            <PMTable
              columns={columns}
              data={tableData}
              striped={true}
              hoverable={true}
              size="md"
              variant="line"
              onSort={handleSort}
            />
          </PMBox>
        </>
      ) : (
        <>
          {onEmptyStateChange && onEmptyStateChange(true)}
          <PackagesBlankState orgSlug={orgSlug} spaceSlug={spaceSlug} />
        </>
      )}
    </>
  );
};
