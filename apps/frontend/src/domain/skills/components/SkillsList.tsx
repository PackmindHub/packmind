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
  PMBadge,
  useTableSort,
} from '@packmind/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { SkillId } from '@packmind/types';

import {
  useGetSkillsQuery,
  useDeleteSkillsBatchMutation,
} from '../api/queries/SkillsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';
import { SkillsBlankState } from './SkillsBlankState';
import { SKILL_MESSAGES } from '../constants/messages';
import { UserAvatarWithInitials } from '../../accounts/components/UserAvatarWithInitials';
import { PackageCountBadge } from '../../deployments/components/PackageCountBadge';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { getArtifactPackages } from '../../deployments/hooks/usePackagesForArtifact';
import { formatPackageNames } from '../../deployments/components/PackageCountBadge';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { SpacesManagementActions } from '@packmind/proprietary/frontend/domain/spaces-management/components/SpacesManagementActions';

interface ISkillsListProps {
  orgSlug: string;
}

export const SkillsList = ({ orgSlug }: ISkillsListProps) => {
  const { spaceSlug, spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();
  const { data: skills, isLoading, isError } = useGetSkillsQuery();
  const deleteBatchMutation = useDeleteSkillsBatchMutation();
  const { data: packagesResponse } = useListPackagesBySpaceQuery(
    spaceId,
    organization?.id,
  );
  const { data: groupedProposals } = useGetGroupedChangeProposalsQuery();
  const pendingReviewCountBySkillId = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!groupedProposals) return map;
    for (const item of groupedProposals.skills) {
      map.set(item.artefactId, item.changeProposalCount);
    }
    return map;
  }, [groupedProposals]);
  const { sortKey, sortDirection, handleSort, getSortDirection } = useTableSort(
    {
      defaultSortKey: 'name',
      defaultSortDirection: 'asc',
    },
  );

  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [filteredSkillIds, setFilteredSkillIds] = React.useState<SkillId[]>([]);
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
    setSelectedSkillIds(filteredSkillIds);
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

    setFilteredSkillIds(filteredSkills.map((s) => s.id));

    const packageNamesById =
      sortKey === 'packages'
        ? new Map(
            filteredSkills.map((s) => [
              s.id,
              formatPackageNames(
                getArtifactPackages(packagesResponse?.packages, s.id, 'skill'),
              ),
            ]),
          )
        : null;

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
        case 'pendingReviews':
          return (
            direction *
            ((pendingReviewCountBySkillId.get(a.id) ?? 0) -
              (pendingReviewCountBySkillId.get(b.id) ?? 0))
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
        ...(groupedProposals
          ? {
              pendingReviews: (() => {
                const count = pendingReviewCountBySkillId.get(skill.id) ?? 0;
                if (count > 0 && spaceSlug) {
                  return (
                    <PMLink asChild>
                      <Link
                        to={routes.space.toReviewChangesArtefact(
                          orgSlug,
                          spaceSlug,
                          'skills',
                          skill.id,
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
                pendingReviewCountBySkillId.get(skill.id) ?? 0,
            }
          : {}),
        packages: (
          <PackageCountBadge
            artifactId={skill.id}
            artifactType="skill"
            orgSlug={orgSlug}
            spaceSlug={spaceSlug}
            spaceId={spaceId}
            organizationId={organization?.id}
          />
        ),
      })),
    );
  }, [
    skills,
    selectedSkillIds,
    spaceSlug,
    spaceId,
    orgSlug,
    organization?.id,
    sortKey,
    sortDirection,
    searchQuery,
    packagesResponse,
    pendingReviewCountBySkillId,
    groupedProposals,
  ]);

  const isAllSelected =
    filteredSkillIds.length > 0 &&
    filteredSkillIds.every((id) => selectedSkillIds.includes(id));
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
    ...(groupedProposals
      ? [
          {
            key: 'pendingReviews',
            header: 'Pending reviews',
            width: '150px',
            align: 'center' as const,
            sortable: true,
            sortDirection: getSortDirection('pendingReviews'),
          },
        ]
      : []),
    {
      key: 'packages',
      header: 'Packages',
      width: '220px',
      align: 'left',
      sortable: true,
      sortDirection: getSortDirection('packages'),
    },
  ];

  if (isLoading) return <PMText>Loading...</PMText>;
  if (isError) return <PMText color="error">Error loading skills.</PMText>;

  if (!skills?.length) {
    return <SkillsBlankState orgSlug={orgSlug} spaceSlug={spaceSlug} />;
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
          <SpacesManagementActions
            artifactType="skill"
            selectedIds={selectedSkillIds}
            isSomeSelected={isSomeSelected}
            onSuccess={() => setSelectedSkillIds([])}
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
