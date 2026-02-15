import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMHStack,
  PMText,
  PMButton,
  PMAlert,
  PMAlertDialog,
  PMCheckbox,
  PMInput,
  useTableSort,
} from '@packmind/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { SkillId } from '@packmind/types';

import {
  useGetSkillsQuery,
  useDeleteSkillsBatchMutation,
} from '../api/queries/SkillsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';
import { SkillsBlankState } from './SkillsBlankState';
import { SKILL_MESSAGES } from '../constants/messages';
import { UserAvatarWithInitials } from '../../accounts/components/UserAvatarWithInitials';

interface ISkillsListProps {
  orgSlug: string;
}

export const SkillsList = ({ orgSlug }: ISkillsListProps) => {
  const { spaceSlug } = useCurrentSpace();
  const { data: skills, isLoading, isError } = useGetSkillsQuery();
  const deleteBatchMutation = useDeleteSkillsBatchMutation();
  const { sortKey, sortDirection, handleSort, getSortDirection } = useTableSort(
    {
      defaultSortKey: 'name',
      defaultSortDirection: 'asc',
    },
  );

  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSkillIds, setSelectedSkillIds] = React.useState<SkillId[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const checkSkill = (skillId: SkillId) => {
    setSelectedSkillIds((prev) => [...prev, skillId]);
  };

  const uncheckSkill = (skillId: SkillId) => {
    setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
  };

  const selectAll = () => {
    if (!skills) return;
    setSelectedSkillIds(skills.map((skill) => skill.id));
  };

  const clearAll = () => setSelectedSkillIds([]);

  const handleBatchDelete = async () => {
    if (selectedSkillIds.length === 0) return;

    try {
      const count = selectedSkillIds.length;
      await deleteBatchMutation.mutateAsync(selectedSkillIds);
      setSelectedSkillIds([]);
      setDeleteAlert({
        type: 'success',
        message: SKILL_MESSAGES.success.deletedBatch(count),
      });
      setDeleteModalOpen(false);

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete skills:', error);
      setDeleteAlert({
        type: 'error',
        message: SKILL_MESSAGES.error.deleteBatchFailed,
      });
      setDeleteModalOpen(false);
    }
  };

  React.useEffect(() => {
    if (!skills) return;

    const filteredSkills = skills.filter((skill) =>
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const sortedSkills = [...filteredSkills].sort((a, b) => {
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
        default:
          return 0;
      }
    });

    setTableData(
      sortedSkills.map((skill) => ({
        key: skill.id,
        select: (
          <PMCheckbox
            checked={selectedSkillIds.includes(skill.id)}
            onCheckedChange={(event) => {
              const checked = event.checked === true;
              if (checked) {
                checkSkill(skill.id);
              } else {
                uncheckSkill(skill.id);
              }
            }}
          />
        ),
        name: (
          <PMLink asChild>
            <Link
              to={
                spaceSlug
                  ? routes.space.toSkill(orgSlug, spaceSlug, skill.slug)
                  : '#'
              }
            >
              {skill.name}
            </Link>
          </PMLink>
        ),
        updatedAt: formatDistanceToNowStrict(skill.updatedAt || new Date(), {
          addSuffix: true,
        }),
        version: skill.version,
        createdBy: skill.createdBy?.displayName ? (
          <UserAvatarWithInitials
            displayName={skill.createdBy.displayName}
            size="xs"
          />
        ) : (
          <span>-</span>
        ),
      })),
    );
  }, [
    skills,
    selectedSkillIds,
    spaceSlug,
    orgSlug,
    sortKey,
    sortDirection,
    searchQuery,
  ]);

  const isAllSelected =
    skills?.length && selectedSkillIds.length === skills.length;
  const isSomeSelected = selectedSkillIds.length > 0;

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
    {
      key: 'name',
      header: 'Name',
      grow: true,
      sortable: true,
      sortDirection: getSortDirection('name'),
    },
    {
      key: 'createdBy',
      header: 'Created by',
      width: '120px',
      align: 'center',
      sortable: true,
      sortDirection: getSortDirection('createdBy'),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      width: '250px',
      align: 'center',
      sortable: true,
      sortDirection: getSortDirection('updatedAt'),
    },
    {
      key: 'version',
      header: 'Version',
      width: '100px',
      align: 'center',
      sortable: true,
      sortDirection: getSortDirection('version'),
    },
  ];

  if (isLoading) return <PMText>Loading...</PMText>;
  if (isError) return <PMText color="error">Error loading skills.</PMText>;

  if (!skills?.length) {
    return <SkillsBlankState spaceSlug={spaceSlug} />;
  }

  return (
    <PMBox>
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      <PMBox mb={4}>
        <PMInput
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </PMBox>

      <PMBox mb={2}>
        <PMHStack gap={2}>
          <PMAlertDialog
            trigger={
              <PMButton
                variant="secondary"
                loading={deleteBatchMutation.isPending}
                size="sm"
                disabled={!isSomeSelected}
              >
                {`Delete (${selectedSkillIds.length})`}
              </PMButton>
            }
            title="Delete Skills"
            message={SKILL_MESSAGES.confirmation.deleteBatchSkills(
              selectedSkillIds.length,
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
            onClick={() => setSelectedSkillIds([])}
            size="sm"
            disabled={!isSomeSelected}
          >
            Clear Selection
          </PMButton>
        </PMHStack>
      </PMBox>

      <PMTable
        columns={columns}
        data={tableData}
        striped
        hoverable
        size="md"
        variant="line"
        onSort={handleSort}
      />
    </PMBox>
  );
};
