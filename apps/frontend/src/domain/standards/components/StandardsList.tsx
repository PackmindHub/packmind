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
  PMEmptyState,
} from '@packmind/ui';

import {
  useGetStandardsQuery,
  useDeleteStandardsBatchMutation,
} from '../api/queries/StandardsQueries';

import { DeployStandardButton } from '../../deployments/components/StandardDeployments/DeployStandardButton';
import './StandardsList.styles.scss';
import { StandardId } from '@packmind/shared/types';
import { STANDARD_MESSAGES } from '../constants/messages';
import { formatDistanceToNowStrict } from 'date-fns';
import { GETTING_STARTED_CREATE_DIALOG } from '../../organizations/components/dashboard/GettingStartedWidget';
import { GettingStartedLearnMoreDialog } from '../../organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';

interface StandardsListProps {
  orgSlug?: string;
}

export const StandardsList = ({ orgSlug }: StandardsListProps = {}) => {
  const { spaceSlug } = useCurrentSpace();

  const {
    data: listStandardsResponse,
    isLoading,
    isError,
  } = useGetStandardsQuery();
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

  const checkStandard = (standardId: StandardId) => {
    setSelectedStandardIds((prev) => [...prev, standardId]);
  };

  const uncheckStandard = (standardId: StandardId) => {
    setSelectedStandardIds((prev) => prev.filter((id) => id !== standardId));
  };

  const selectAll = () => {
    if (!listStandardsResponse) return;
    setSelectedStandardIds(
      listStandardsResponse.standards.map((standard) => standard.id),
    );
  };

  const clearAll = () => setSelectedStandardIds([]);

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

  const selectedStandards = (listStandardsResponse?.standards ?? []).filter(
    (standard) => selectedStandardIds.includes(standard.id),
  );

  React.useEffect(() => {
    if (!listStandardsResponse) return;

    setTableData(
      listStandardsResponse.standards.map((standard) => ({
        key: standard.id,
        select: (
          <PMCheckbox
            checked={selectedStandardIds.includes(standard.id)}
            onCheckedChange={(event) => {
              const checked = event.checked === true;
              if (checked) {
                checkStandard(standard.id);
              } else {
                uncheckStandard(standard.id);
              }
            }}
          />
        ),
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
        updatedAt: (
          <>
            {formatDistanceToNowStrict(standard.updatedAt || new Date(), {
              addSuffix: true,
            })}
          </>
        ),
        version: standard.version,
      })),
    );
  }, [listStandardsResponse, selectedStandardIds, spaceSlug, orgSlug]);

  const isAllSelected =
    listStandardsResponse &&
    selectedStandardIds.length === listStandardsResponse.standards.length;
  const isSomeSelected = selectedStandardIds.length > 0;

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected || false}
          onCheckedChange={() => {
            if (isAllSelected) {
              clearAll();
            } else {
              selectAll();
            }
          }}
          controlProps={{ borderColor: 'border.checkbox' }}
        />
      ),
      width: '50px',
      align: 'center',
    },
    { key: 'name', header: 'Name', grow: true },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      width: '250px',
      align: 'center',
    },
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
      {(listStandardsResponse?.standards ?? []).length ? (
        <PMBox>
          <PMBox mb={2}>
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
                    disabled={!isSomeSelected}
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
                onOpenChange={(details) => setDeleteModalOpen(details.open)}
                isLoading={deleteBatchMutation.isPending}
              />
              <PMButton
                variant="secondary"
                onClick={() => setSelectedStandardIds([])}
                size={'sm'}
                disabled={!isSomeSelected}
              >
                Clear Selection
              </PMButton>
            </PMHStack>
          </PMBox>
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
          title={'No standards yet'}
        >
          Standards align coding assistants and developers on your
          organization's conventions and best practices.
          <PMHStack>
            <GettingStartedLearnMoreDialog
              body={GETTING_STARTED_CREATE_DIALOG.body}
              title={GETTING_STARTED_CREATE_DIALOG.title}
              buttonLabel="Create from your code"
              buttonSize="sm"
            />
            {spaceSlug && (
              <Link
                to={routes.space.toCreateStandard(orgSlug || '', spaceSlug)}
              >
                <PMButton variant="secondary">Create from scratch</PMButton>
              </Link>
            )}
          </PMHStack>
        </PMEmptyState>
      )}
    </div>
  );
};
