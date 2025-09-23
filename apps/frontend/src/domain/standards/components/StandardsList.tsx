import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMHStack,
  PMLink,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMAlert,
  PMAlertDialog,
  PMCheckbox,
} from '@packmind/ui';

import {
  useGetStandardsQuery,
  useDeleteStandardsBatchMutation,
} from '../api/queries/StandardsQueries';

import { DeployStandardButton } from '../../deployments/components/StandardDeployments/DeployStandardButton';
import './StandardsList.styles.scss';
import { StandardId } from '@packmind/standards/types';
import { STANDARD_MESSAGES } from '../constants/messages';

interface StandardsListProps {
  orgSlug?: string;
}

export const StandardsList = ({ orgSlug }: StandardsListProps = {}) => {
  const { data: standards, isLoading, isError } = useGetStandardsQuery();
  const deleteBatchMutation = useDeleteStandardsBatchMutation();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = React.useState<
    StandardId[]
  >([]);

  // Alert state management for batch deployment (plus utilisé)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
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

  const selectedStandards =
    standards?.filter((standard) =>
      selectedStandardIds.includes(standard.id),
    ) || [];

  React.useEffect(() => {
    if (!standards) return;

    setTableData(
      standards.map((standard) => ({
        key: standard.id,
        select: (
          <PMCheckbox
            checked={selectedStandardIds.includes(standard.id)}
            onCheckedChange={(event) => {
              handleSelectStandard(standard.id, event.checked === true);
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
          onCheckedChange={() => {
            handleSelectAll(!isAllSelected);
          }}
          controlProps={{ borderColor: 'border.checkbox' }}
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
                  selectedStandards={selectedStandards}
                  disabled={selectedStandardIds.length === 0}
                  size="sm"
                />
                <PMAlertDialog
                  trigger={
                    <PMButton
                      variant="secondary"
                      loading={deleteBatchMutation.isPending}
                      size={'sm'}
                    >
                      {`Delete (${selectedStandardIds.length})`}
                    </PMButton>
                  }
                  title="Delete Standards"
                  message={STANDARD_MESSAGES.confirmation.deleteBatchStandards(
                    selectedStandardIds.length,
                  )}
                  confirmText="Delete"
                  cancelText="Cancel"
                  confirmColorScheme="red"
                  onConfirm={handleBatchDelete}
                  open={deleteModalOpen}
                  onOpenChange={setDeleteModalOpen}
                  isLoading={deleteBatchMutation.isPending}
                />
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
    </div>
  );
};
