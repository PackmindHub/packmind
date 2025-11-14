import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMHStack,
  PMCheckbox,
  PMAlertDialog,
  PMButtonGroup,
  PMAlert,
} from '@packmind/ui';
import { PackageId } from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  useListPackagesBySpaceQuery,
  useDeletePackagesBatchMutation,
} from '../../api/queries/DeploymentsQueries';
import { routes } from '../../../../shared/utils/routes';
import { PACKAGE_MESSAGES } from '../../constants/messages';

export interface PackagesPageProps {
  spaceSlug: string;
  orgSlug: string;
}

export const PackagesPage: React.FC<PackagesPageProps> = ({
  spaceSlug,
  orgSlug,
}) => {
  const { spaceId, space, isLoading: isLoadingSpace } = useCurrentSpace();
  const organizationId = space?.organizationId;

  const {
    data: packagesResponse,
    isLoading: isLoadingPackages,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  const deleteBatchMutation = useDeletePackagesBatchMutation();

  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = React.useState<
    PackageId[]
  >([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const packages = packagesResponse?.packages ?? [];
  const isSomeSelected = selectedPackageIds.length > 0;
  const isAllSelected =
    packages.length > 0 && selectedPackageIds.length === packages.length;

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

    setTableData(
      packagesResponse.packages.map((pkg) => ({
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
        description: <>{pkg.description || '-'}</>,
        recipes: <>{pkg.recipes?.length || 0}</>,
        standards: <>{pkg.standards?.length || 0}</>,
      })),
    );
  }, [packagesResponse, orgSlug, spaceSlug, selectedPackageIds]);

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
    { key: 'name', header: 'Name', width: '250px' },
    { key: 'description', header: 'Description', grow: true },
    { key: 'recipes', header: 'Recipes', width: '100px', align: 'center' },
    { key: 'standards', header: 'Standards', width: '100px', align: 'center' },
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
        <PMBox>
          {isSomeSelected && (
            <PMBox mb={4}>
              <PMButtonGroup>
                <PMAlertDialog
                  trigger={
                    <PMButton
                      variant="secondary"
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
          )}
          <PMTable
            columns={columns}
            data={tableData}
            striped={true}
            hoverable={true}
            size="md"
            variant="line"
          />
        </PMBox>
      ) : (
        <PMEmptyState
          backgroundColor={'background.primary'}
          borderRadius={'md'}
          width={'2xl'}
          mx={'auto'}
          title={'No packages yet'}
        >
          Packages are collections of standards and recipes that can be deployed
          together to your repositories, ensuring consistent practices across
          your projects.
          <PMHStack>
            <Link to={routes.space.toCreatePackage(orgSlug, spaceSlug)}>
              <PMButton variant="secondary">Create Package</PMButton>
            </Link>
          </PMHStack>
        </PMEmptyState>
      )}
    </>
  );
};
