import React from 'react';
import {
  PMSpinner,
  PMText,
  PMCheckbox,
  PMVStack,
  PMButton,
  PMButtonGroup,
  PMAlert,
  PMBox,
  PMEmptyState,
  PMHeading,
  PMHStack,
  PMBadge,
  PMNativeSelect,
} from '@packmind/ui';
import { useRunDistribution } from './RunDistribution';
import { TargetId } from '@packmind/shared';

export const RunDistributionBodyImpl: React.FC = () => {
  const {
    targetsList,
    targetsLoading,
    targetsError,
    selectedTargetIds,
    setSelectedTargetIds,
    deploymentError,
  } = useRunDistribution();

  const [selectedRepo, setSelectedRepo] = React.useState<string>('');

  const groupedTargets = React.useMemo(() => {
    return [...targetsList].reduce(
      (acc, target) => {
        const repoKey = `${target.repository.owner}/${target.repository.repo}`;
        if (!acc[repoKey]) acc[repoKey] = [];
        acc[repoKey].push(target);
        return acc;
      },
      {} as Record<string, typeof targetsList>,
    );
  }, [targetsList]);

  const repoOptions = React.useMemo(
    () =>
      Object.keys(groupedTargets).map((repoKey) => ({
        label: repoKey,
        value: repoKey,
      })),
    [groupedTargets],
  );

  if (targetsLoading) return <PMSpinner />;
  if (targetsError)
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>
          Error while loading targets. Please try again later
        </PMAlert.Title>
      </PMAlert.Root>
    );

  if (targetsList.length === 0)
    return (
      <PMEmptyState
        title="No targets configured"
        description="Configure deployment targets in your repositories to deploy recipes and standards"
      />
    );

  const sortedTargets = [...targetsList].sort((a, b) => {
    const ownerCompare = a.repository.owner.localeCompare(b.repository.owner);
    if (ownerCompare !== 0) return ownerCompare;
    const repoCompare = a.repository.repo.localeCompare(b.repository.repo);
    if (repoCompare !== 0) return repoCompare;
    const branchCompare = a.repository.branch.localeCompare(
      b.repository.branch,
    );
    if (branchCompare !== 0) return branchCompare;
    return a.name.localeCompare(b.name);
  });

  const handleCheckboxChange = (targetId: TargetId, checked: boolean) => {
    if (checked) {
      setSelectedTargetIds((prev: TargetId[]) => [...prev, targetId]);
    } else {
      setSelectedTargetIds((prev: TargetId[]) =>
        prev.filter((id) => id !== targetId),
      );
    }
  };

  return (
    <PMVStack gap={2} align={'stretch'} height="full">
      <PMHStack>
        <PMButtonGroup size={'xs'}>
          <PMButton
            variant="secondary"
            onClick={() =>
              setSelectedTargetIds(sortedTargets.map((target) => target.id))
            }
          >
            Select All
          </PMButton>
          <PMButton
            variant="secondary"
            onClick={() => setSelectedTargetIds([])}
          >
            Clear Selection
          </PMButton>
        </PMButtonGroup>
        <PMNativeSelect
          items={[{ label: 'All repositories', value: '' }, ...repoOptions]}
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          size={'sm'}
        />
      </PMHStack>
      <PMBox maxHeight="lg" overflow={'auto'}>
        {Object.entries(groupedTargets)
          .filter(([repoKey]) => !selectedRepo || repoKey === selectedRepo)
          .map(([repoKey, repoTargets]) => (
            <PMVStack key={repoKey} align="stretch" gap={1} mb={4}>
              <PMHeading level="h6" mb={1}>
                {repoKey}
              </PMHeading>
              <PMVStack mb={2}>
                {repoTargets.map((target) => (
                  <PMCheckbox
                    key={target.id}
                    value={target.id}
                    checked={selectedTargetIds.includes(target.id)}
                    controlProps={{ borderColor: 'border.checkbox' }}
                    padding={2}
                    gap={4}
                    size={'sm'}
                    border={'solid 1px'}
                    borderColor={'border.tertiary'}
                    width="full"
                    onChange={(event) => {
                      const input = event.target as HTMLInputElement;
                      handleCheckboxChange(target.id, input.checked);
                    }}
                    _checked={{ bg: 'blue.900', borderColor: 'blue.500' }}
                  >
                    <PMVStack align="flex-start" gap={2}>
                      <PMText fontWeight="medium" fontSize="sm">
                        {target.name}
                      </PMText>
                      <PMHStack>
                        <PMBadge size="sm">
                          Branch: {target.repository.branch}
                        </PMBadge>
                        <PMBadge size="sm">Path: {target.path}</PMBadge>
                      </PMHStack>
                    </PMVStack>
                  </PMCheckbox>
                ))}
              </PMVStack>
            </PMVStack>
          ))}
      </PMBox>
      {deploymentError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>{deploymentError.message}</PMAlert.Title>
        </PMAlert.Root>
      )}
    </PMVStack>
  );
};
