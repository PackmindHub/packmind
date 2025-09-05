import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMHStack,
  PMLink,
  PMButton,
  PMText,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMAlert,
  PMSpinner,
  PMDialog,
  PMCheckbox,
} from '@packmind/ui';

import {
  useGetStandardsQuery,
  useDeleteStandardsBatchMutation,
} from '../api/queries/StandardsQueries';

import { DeployStandardButton } from '../../deployments/components/StandardDeployments/DeployStandardButton';
import { useDeployStandard } from '../../deployments/hooks';
import './StandardsList.styles.scss';
import { StandardId } from '@packmind/standards/types';
import { GitRepoId } from '@packmind/git/types';
import { STANDARD_MESSAGES } from '../constants/messages';

interface StandardsListProps {
  orgSlug?: string;
}

export const StandardsList = ({ orgSlug }: StandardsListProps = {}) => {
  const { data: standards, isLoading, isError } = useGetStandardsQuery();
  const deleteBatchMutation = useDeleteStandardsBatchMutation();
  const { deployStandards, isDeploying } = useDeployStandard();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = React.useState<
    StandardId[]
  >([]);

  // Alert state management for batch deployment
  const [batchDeploymentAlert, setBatchDeploymentAlert] = React.useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSelectStandard = (standardId: StandardId, isChecked: boolean) => {
    if (isChecked) {
      setSelectedStandardIds((prev) => [...prev, standardId]);
    } else {
      setSelectedStandardIds((prev) => prev.filter((id) => id !== standardId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked && standards) {
      setSelectedStandardIds(standards.map((standard) => standard.id));
    } else {
      setSelectedStandardIds([]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedStandardIds.length === 0) return;

    try {
      const count = selectedStandardIds.length;
      await deleteBatchMutation.mutateAsync(selectedStandardIds);
      setSelectedStandardIds([]);
      setDeleteAlert({
        type: 'success',
        message:
          count === 1
            ? STANDARD_MESSAGES.success.deleted
            : `${count} standards deleted successfully!`,
      });
      setDeleteDialogOpen(false);

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
      setDeleteDialogOpen(false);
    }
  };

  const handleBatchDeploy = async (repositoryIds: GitRepoId[]) => {
    if (selectedStandardIds.length === 0) return;

    try {
      // Show loading alert with spinner
      setBatchDeploymentAlert({
        type: 'info',
        message: `Deploying ${selectedStandardIds.length} standard(s)...`,
      });

      const selectedStandards =
        standards
          ?.filter((standard) => selectedStandardIds.includes(standard.id))
          .map((standard) => ({
            id: standard.id,
            version: standard.version,
            name: standard.name,
          })) || [];

      await deployStandards({ standards: selectedStandards }, repositoryIds);

      // Show success alert
      setBatchDeploymentAlert({
        type: 'success',
        message: `${selectedStandardIds.length} standard(s) deployed successfully!`,
      });

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setBatchDeploymentAlert(null);
      }, 3000);

      // Clear selection after successful deployment
      setSelectedStandardIds([]);
    } catch (error) {
      console.error('Failed to deploy standards:', error);
      setBatchDeploymentAlert({
        type: 'error',
        message: STANDARD_MESSAGES.error.deployFailed,
      });
    }
  };

  React.useEffect(() => {
    if (!standards) return;

    setTableData(
      standards.map((standard) => ({
        key: standard.id,
        select: (
          <PMCheckbox
            checked={selectedStandardIds.includes(standard.id)}
            onChange={(event) => {
              const input = event.target as HTMLInputElement;
              handleSelectStandard(standard.id, input.checked);
            }}
          />
        ),
        name: (
          <PMLink asChild>
            <Link
              to={
                orgSlug
                  ? `/org/${orgSlug}/standards/${standard.id}`
                  : `/standards/${standard.id}`
              }
            >
              {standard.name}
            </Link>
          </PMLink>
        ),
        slug: standard.slug,
        description:
          standard.description.length > 100
            ? `${standard.description.substring(0, 100)}...`
            : standard.description,
        scope: standard.scope || '-',
        version: standard.version,
      })),
    );
  }, [standards, selectedStandardIds, orgSlug]);

  const isAllSelected =
    standards && selectedStandardIds.length === standards.length;
  const isSomeSelected = selectedStandardIds.length > 0;

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected || false}
          onChange={(e) => {
            handleSelectAll(!isAllSelected);
          }}
        />
      ),
      width: '50px',
      align: 'center',
    },
    { key: 'name', header: 'Name', grow: true },
    { key: 'slug', header: 'Slug', grow: true },
    { key: 'description', header: 'Description', grow: true },
    { key: 'scope', header: 'Scope', width: '120px', align: 'center' },
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
  ];

  return (
    <div className={'standards-list'}>
      {batchDeploymentAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={batchDeploymentAlert.type}>
            {batchDeploymentAlert.type === 'info' ? (
              <PMAlert.Indicator>
                <PMSpinner size="sm" />
              </PMAlert.Indicator>
            ) : (
              <PMAlert.Indicator />
            )}
            <PMAlert.Title>{batchDeploymentAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

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
      {isError && <p>Error loading standards.</p>}
      {standards?.length ? (
        <PMBox>
          {isSomeSelected && (
            <PMBox mb={4}>
              <PMHStack gap={2}>
                <DeployStandardButton
                  label={`Deploy (${selectedStandardIds.length})`}
                  onDeploy={handleBatchDeploy}
                  loading={isDeploying}
                  disabled={selectedStandardIds.length === 0}
                  size="sm"
                />
                <PMButton
                  variant="secondary"
                  onClick={() => setDeleteDialogOpen(true)}
                  loading={deleteBatchMutation.isPending}
                  size={'sm'}
                >
                  {`Delete (${selectedStandardIds.length})`}
                </PMButton>
                <PMButton
                  variant="secondary"
                  onClick={() => setSelectedStandardIds([])}
                  size={'sm'}
                >
                  Clear Selection
                </PMButton>
              </PMHStack>
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
        <p>No standards found</p>
      )}

      {/* Delete Confirmation Dialog */}
      <PMDialog.Root
        open={deleteDialogOpen}
        onOpenChange={({ open }) => setDeleteDialogOpen(open)}
      >
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Delete Standards</PMDialog.Title>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMText>
                {STANDARD_MESSAGES.confirmation.deleteBatchStandards(
                  selectedStandardIds.length,
                )}
              </PMText>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButton
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </PMButton>
              <PMButton
                colorScheme="red"
                onClick={handleBatchDelete}
                loading={deleteBatchMutation.isPending}
              >
                Delete
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMDialog.Root>
    </div>
  );
};
