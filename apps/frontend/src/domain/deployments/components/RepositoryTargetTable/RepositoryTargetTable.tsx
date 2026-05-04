import React from 'react';
import { PMAccordion, PMBadge, PMBox, PMText, PMVStack } from '@packmind/ui';
import { TargetId } from '@packmind/types';
import { PackageArtifactsTable } from '../PackageArtifactsTable';
import { PackageGroup } from '../../utils/groupTargetByPackage';

type Mode = 'all' | 'outdated' | 'up-to-date';

export type RepositoryTargetTableProps = {
  orgSlug?: string;
  target: { id: TargetId; name: string; path?: string };
  packageGroups: ReadonlyArray<PackageGroup>;
  mode?: Mode;
  canDistributeFromApp: boolean;
  isDistributeReadinessLoading: boolean;
};

export const RepositoryTargetTable: React.FC<RepositoryTargetTableProps> = ({
  orgSlug,
  target,
  packageGroups,
  mode = 'all',
  canDistributeFromApp,
  isDistributeReadinessLoading,
}) => {
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
      <PMAccordion.Root multiple collapsible>
        <PMVStack align="stretch" width="full" gap={4}>
          {packageGroups.map((group) => (
            <PackageArtifactsTable
              key={`pkg-${group.pkg.id}`}
              orgSlug={orgSlug}
              packageName={group.pkg.name}
              packageId={group.pkg.id}
              targetId={target.id}
              recipes={group.recipes}
              standards={group.standards}
              skills={group.skills}
              pendingRecipes={group.pendingRecipes}
              pendingStandards={group.pendingStandards}
              pendingSkills={group.pendingSkills}
              mode={mode}
              canDistributeFromApp={canDistributeFromApp}
              isDistributeReadinessLoading={isDistributeReadinessLoading}
            />
          ))}
        </PMVStack>
      </PMAccordion.Root>
    </PMVStack>
  );
};
