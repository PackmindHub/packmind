import React from 'react';
import { Link, useParams } from 'react-router';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMBox,
  PMLink,
  PMTabs,
  PMBadge,
  PMText,
  PMCheckbox,
  PMButton,
  PMButtonGroup,
  PMAlert,
  PMTextArea,
} from '@packmind/ui';
import { KnowledgePatchStatus, KnowledgePatchId } from '@packmind/types';
import {
  useGetKnowledgePatchesBySpaceQuery,
  useBatchRejectKnowledgePatchesMutation,
} from '../api/queries/LearningsQueries';
import { routes } from '../../../shared/utils/routes';

export const KnowledgePatchesList = () => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data, isLoading, isError } = useGetKnowledgePatchesBySpaceQuery();
  const batchRejectMutation = useBatchRejectKnowledgePatchesMutation();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(
    KnowledgePatchStatus.PENDING_REVIEW,
  );
  const [selectedPatchIds, setSelectedPatchIds] = React.useState<
    KnowledgePatchId[]
  >([]);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [alert, setAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSelectPatch = (patchId: KnowledgePatchId, isChecked: boolean) => {
    if (isChecked) {
      setSelectedPatchIds((prev) =>
        prev.includes(patchId) ? prev : [...prev, patchId],
      );
    } else {
      setSelectedPatchIds((prev) => prev.filter((id) => id !== patchId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (!data) return;

    const filteredPatches =
      selectedStatus === 'all'
        ? data.patches
        : data.patches.filter((patch) => patch.status === selectedStatus);

    const pendingPatches = filteredPatches.filter(
      (patch) => patch.status === KnowledgePatchStatus.PENDING_REVIEW,
    );

    if (isChecked) {
      setSelectedPatchIds(pendingPatches.map((p) => p.id));
    } else {
      setSelectedPatchIds([]);
    }
  };

  const handleOpenRejectDialog = () => {
    if (!isSomeSelected) return;
    setRejectDialogOpen(true);
  };

  const handleBatchReject = async () => {
    if (!reviewNotes.trim()) {
      setAlert({
        type: 'error',
        message: 'Review notes are required for rejection',
      });
      setRejectDialogOpen(false);
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    try {
      const count = selectedPatchIds.length;
      await batchRejectMutation.mutateAsync({
        patchIds: selectedPatchIds,
        reviewNotes,
      });
      setSelectedPatchIds([]);
      setReviewNotes('');
      setAlert({
        type: 'success',
        message: `${count} ${count === 1 ? 'patch' : 'patches'} rejected successfully`,
      });
      setRejectDialogOpen(false);

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to reject patches:', error);
      setAlert({
        type: 'error',
        message: 'Failed to reject patches. Please try again.',
      });
      setRejectDialogOpen(false);
    }
  };

  React.useEffect(() => {
    if (!data || !orgSlug || !spaceSlug) return;

    const filteredPatches =
      selectedStatus === 'all'
        ? data.patches
        : data.patches.filter((patch) => patch.status === selectedStatus);

    setTableData(
      filteredPatches.map((patch) => {
        const isPending = patch.status === KnowledgePatchStatus.PENDING_REVIEW;
        return {
          key: patch.id,
          select: (
            <PMCheckbox
              checked={selectedPatchIds.includes(patch.id)}
              disabled={!isPending}
              onCheckedChange={(e) => {
                handleSelectPatch(patch.id, e.checked === true);
              }}
            />
          ),
          type: <PMBadge colorScheme="blue">{patch.patchType}</PMBadge>,
          status: (
            <PMBadge
              colorScheme={
                patch.status === KnowledgePatchStatus.ACCEPTED
                  ? 'green'
                  : patch.status === KnowledgePatchStatus.REJECTED
                    ? 'red'
                    : 'yellow'
              }
            >
              {patch.status}
            </PMBadge>
          ),
          createdAt: (
            <PMText>{new Date(patch.createdAt).toLocaleDateString()}</PMText>
          ),
          actions: (
            <PMLink asChild>
              <Link
                to={routes.space.toLearningsPatch(orgSlug, spaceSlug, patch.id)}
              >
                View
              </Link>
            </PMLink>
          ),
        };
      }),
    );
  }, [data, orgSlug, spaceSlug, selectedStatus, selectedPatchIds]);

  const filteredPatches =
    selectedStatus === 'all'
      ? data?.patches || []
      : data?.patches.filter((patch) => patch.status === selectedStatus) || [];

  const pendingPatches = filteredPatches.filter(
    (patch) => patch.status === KnowledgePatchStatus.PENDING_REVIEW,
  );

  const isAllSelected =
    pendingPatches.length > 0 &&
    selectedPatchIds.length === pendingPatches.length;
  const isSomeSelected = selectedPatchIds.length > 0;

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
    { key: 'type', header: 'Type', width: '200px' },
    { key: 'status', header: 'Status', width: '150px' },
    { key: 'createdAt', header: 'Created', width: '150px' },
    { key: 'actions', header: '', width: '80px', align: 'right' },
  ];

  if (isLoading) {
    return <PMBox>Loading...</PMBox>;
  }

  if (isError) {
    return (
      <PMBox>
        <PMEmptyState
          title="Failed to load knowledge patches"
          description="An error occurred while fetching knowledge patches"
        />
      </PMBox>
    );
  }

  if (!data || data.patches.length === 0) {
    return (
      <PMEmptyState
        title="No knowledge patches yet"
        description="Knowledge patches will appear here when your team captures learnings"
      />
    );
  }

  const getTableContent = () => {
    if (tableData.length === 0) {
      const emptyMessages = {
        [KnowledgePatchStatus.PENDING_REVIEW]: {
          title: 'No pending patches',
          description: 'No knowledge patches are waiting for review',
        },
        [KnowledgePatchStatus.ACCEPTED]: {
          title: 'No accepted patches',
          description: 'No knowledge patches have been accepted yet',
        },
        [KnowledgePatchStatus.REJECTED]: {
          title: 'No rejected patches',
          description: 'No knowledge patches have been rejected',
        },
        all: {
          title: 'No knowledge patches yet',
          description:
            'Knowledge patches will appear here when your team captures learnings',
        },
      };

      const message =
        emptyMessages[selectedStatus as keyof typeof emptyMessages] ||
        emptyMessages.all;
      return (
        <PMEmptyState title={message.title} description={message.description} />
      );
    }

    return (
      <PMBox>
        <PMButtonGroup size="sm" mb={4}>
          <PMButton
            variant="secondary"
            colorScheme="red"
            loading={batchRejectMutation.isPending}
            disabled={!isSomeSelected}
            onClick={handleOpenRejectDialog}
          >
            {`Reject (${selectedPatchIds.length})`}
          </PMButton>
          <PMButton
            variant="secondary"
            onClick={() => setSelectedPatchIds([])}
            disabled={!isSomeSelected}
          >
            Clear Selection
          </PMButton>
        </PMButtonGroup>

        {/* Custom Reject Dialog */}
        {rejectDialogOpen && (
          <PMBox
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="rgba(0, 0, 0, 0.5)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            zIndex="modal"
            onClick={() => setRejectDialogOpen(false)}
          >
            <PMBox
              bg="bg.panel"
              p={6}
              borderRadius="md"
              maxW="md"
              w="full"
              mx={4}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <PMText fontSize="lg" fontWeight="semibold" mb={4}>
                Reject Knowledge Patches
              </PMText>
              <PMText mb={2}>
                Are you sure you want to reject {selectedPatchIds.length}{' '}
                {selectedPatchIds.length === 1 ? 'patch' : 'patches'}?
              </PMText>
              <PMText mb={3} fontSize="sm">
                Please provide a reason for rejecting these patches:
              </PMText>
              <PMTextArea
                placeholder="Enter review notes (required)..."
                value={reviewNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setReviewNotes(e.target.value)
                }
                rows={4}
                mb={4}
              />
              <PMButtonGroup>
                <PMButton
                  colorScheme="red"
                  onClick={handleBatchReject}
                  loading={batchRejectMutation.isPending}
                  disabled={!reviewNotes.trim()}
                >
                  Reject
                </PMButton>
                <PMButton
                  variant="secondary"
                  onClick={() => {
                    setRejectDialogOpen(false);
                    setReviewNotes('');
                  }}
                  disabled={batchRejectMutation.isPending}
                >
                  Cancel
                </PMButton>
              </PMButtonGroup>
            </PMBox>
          </PMBox>
        )}

        <PMTable columns={columns} data={tableData} />
      </PMBox>
    );
  };

  const tabs = [
    {
      value: KnowledgePatchStatus.PENDING_REVIEW,
      triggerLabel: 'Pending Review',
      content: getTableContent(),
    },
    {
      value: KnowledgePatchStatus.ACCEPTED,
      triggerLabel: 'Accepted',
      content: getTableContent(),
    },
    {
      value: KnowledgePatchStatus.REJECTED,
      triggerLabel: 'Rejected',
      content: getTableContent(),
    },
    {
      value: 'all',
      triggerLabel: 'All',
      content: getTableContent(),
    },
  ];

  return (
    <PMBox>
      {/* Alert for success/error messages */}
      {alert && (
        <PMBox mb={4}>
          <PMAlert.Root status={alert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{alert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      <PMTabs
        defaultValue={selectedStatus}
        value={selectedStatus}
        onValueChange={(details) => setSelectedStatus(details.value)}
        tabs={tabs}
      />
    </PMBox>
  );
};
