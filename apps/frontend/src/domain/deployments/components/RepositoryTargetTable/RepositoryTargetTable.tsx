import React from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCircleCheckBig } from 'react-icons/lu';
import { TargetId } from '@packmind/types';
import { PackageArtifactsTable } from '../PackageArtifactsTable';
import { PackageGroup } from '../../utils/groupTargetByPackage';

type Mode = 'all' | 'outdated' | 'up-to-date';

export type RepositoryTargetTableProps = {
  orgSlug?: string;
  target: { id: TargetId; name: string; path?: string };
  packageGroups: ReadonlyArray<PackageGroup>;
  mode?: Mode;
};

const groupHasVisibleRows = (group: PackageGroup, mode: Mode): boolean => {
  const matches = <T extends { isUpToDate: boolean; isDeleted?: boolean }>(
    item: T,
  ) => {
    if (mode === 'outdated') return !item.isUpToDate || !!item.isDeleted;
    if (mode === 'up-to-date') return item.isUpToDate && !item.isDeleted;
    return true;
  };
  return (
    group.recipes.some(matches) ||
    group.standards.some(matches) ||
    group.skills.some(matches)
  );
};

export const RepositoryTargetTable: React.FC<RepositoryTargetTableProps> = ({
  orgSlug,
  target,
  packageGroups,
  mode = 'all',
}) => {
  const anyVisible = packageGroups.some((g) => groupHasVisibleRows(g, mode));

  return (
    <PMVStack
      align="stretch"
      width="full"
      gap={4}
      border={'solid 1px'}
      borderColor={'border.primary'}
      padding={2}
    >
      <PMBox>
        <PMBadge colorPalette="gray" size="xs" marginRight={2}>
          Target
        </PMBadge>
        <PMText variant="body-important">{target.name}</PMText>
      </PMBox>
      {anyVisible ? (
        packageGroups.map((group) => (
          <PackageArtifactsTable
            key={`pkg-${group.pkg.id}`}
            orgSlug={orgSlug}
            packageName={group.pkg.name}
            recipes={group.recipes}
            standards={group.standards}
            skills={group.skills}
            mode={mode}
          />
        ))
      ) : (
        <PMHStack gap={2} align="center" mt={4}>
          <PMIcon color={'green.500'}>
            <LuCircleCheckBig />
          </PMIcon>
          <PMText variant="body" color="faded">
            No artifacts distributed here
          </PMText>
        </PMHStack>
      )}
    </PMVStack>
  );
};
