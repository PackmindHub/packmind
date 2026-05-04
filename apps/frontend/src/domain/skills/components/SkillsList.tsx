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
import { formatDistanceToNowStrict } from 'date-fns';
import { Skill, SkillId } from '@packmind/types';

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
import {
  PackageCountBadge,
  formatPackageNames,
} from '../../deployments/components/PackageCountBadge';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { getArtifactPackages } from '../../deployments/hooks/usePackagesForArtifact';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { SpacesManagementActions } from '@packmind/proprietary/frontend/domain/spaces-management/components/SpacesManagementActions';
import {
  ItemsListing,
  ItemsListingProps,
} from '../../../shared/components/ItemsListing';

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

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleBatchDelete = async (
    selectedIds: SkillId[],
    unselectAll: () => void,
  ) => {
    if (!selectedIds.length) return;

    try {
      const count = selectedIds.length;
      await deleteBatchMutation.mutateAsync(selectedIds);
      unselectAll();
      setDeleteAlert({
        type: 'success',
        message: SKILL_MESSAGES.success.deletedBatch(count),
      });
      setDeleteModalOpen(false);

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

  const listingProps: Omit<ItemsListingProps<Skill>, 'items'> = {
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
        width: '120px',
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
    makeTableData(skill): PMTableRow {
      return {
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
        createdBy: skill.createdBy?.displayName ? (
          <UserAvatarWithInitials
            displayName={skill.createdBy.displayName}
            size="xs"
          />
        ) : (
          <span>-</span>
        ),
        updatedAt: (
          <>
            {formatDistanceToNowStrict(skill.updatedAt || new Date(), {
              addSuffix: true,
            })}
          </>
        ),
        version: skill.version,
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
      };
    },
    sortItems(items, sortKey, sortDirection) {
      const packageNamesById =
        sortKey === 'packages'
          ? new Map(
              items.map((s) => [
                s.id,
                formatPackageNames(
                  getArtifactPackages(
                    packagesResponse?.packages,
                    s.id,
                    'skill',
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
    },
    batchActions: [
      ({ selectedIds, unselectAll }) => (
        <PMAlertDialog
          trigger={
            <PMButton
              variant="secondary"
              loading={deleteBatchMutation.isPending}
              size="sm"
              disabled={!selectedIds.length}
            >
              {`Delete (${selectedIds.length})`}
            </PMButton>
          }
          title="Delete Skills"
          message={SKILL_MESSAGES.confirmation.deleteBatchSkills(
            selectedIds.length,
          )}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColorScheme="red"
          onConfirm={() => handleBatchDelete(selectedIds, unselectAll)}
          open={deleteModalOpen}
          onOpenChange={(details) => setDeleteModalOpen(details.open)}
          isLoading={deleteBatchMutation.isPending}
        />
      ),
      ({ selectedIds, unselectAll }) => (
        <SpacesManagementActions
          artifactType="skill"
          selectedIds={selectedIds}
          isSomeSelected={selectedIds.length > 0}
          onSuccess={unselectAll}
        />
      ),
    ],
  };

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Error loading skills.</p>;

  return (
    <PMBox>
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      {skills && skills.length > 0 ? (
        <ItemsListing {...listingProps} items={skills} />
      ) : (
        <SkillsBlankState orgSlug={orgSlug} spaceSlug={spaceSlug} />
      )}
    </PMBox>
  );
};
