import React, { useMemo } from 'react';
import {
  PMText,
  PMCheckbox,
  PMVStack,
  PMButton,
  PMButtonGroup,
  PMBox,
  PMHStack,
  PMBadge,
  PMHeading,
  PMAlert,
} from '@packmind/ui';
import { TargetId } from '@packmind/types';
import { useRemovePackageFromTargetsContext } from './RemovePackageFromTargets';
import { PACKAGE_MESSAGES } from '../../constants/messages';

export const RemovePackageFromTargetsBodyImpl: React.FC = () => {
  const {
    distributions,
    selectedTargetIds,
    setSelectedTargetIds,
    currentStep,
    selectedPackage,
  } = useRemovePackageFromTargetsContext();

  // Extract unique targets from distributions
  const targets = useMemo(() => {
    const targetMap = new Map(
      distributions.map((d) => [d.target.id, d.target]),
    );
    return Array.from(targetMap.values());
  }, [distributions]);

  // Group targets by repository
  const groupedTargets = useMemo(() => {
    return targets.reduce(
      (acc, target) => {
        // Use targetId to get gitRepo info from the distribution
        const distribution = distributions.find(
          (d) => d.target.id === target.id,
        );
        const repoKey = distribution
          ? `${(distribution.target as { gitRepo?: { owner: string; repo: string } }).gitRepo?.owner ?? 'unknown'}/${(distribution.target as { gitRepo?: { owner: string; repo: string } }).gitRepo?.repo ?? 'unknown'}`
          : 'unknown';

        if (!acc[repoKey]) acc[repoKey] = [];
        acc[repoKey].push(target);
        return acc;
      },
      {} as Record<string, typeof targets>,
    );
  }, [targets, distributions]);

  const handleCheckboxChange = (targetId: TargetId, checked: boolean) => {
    if (checked) {
      setSelectedTargetIds((prev) => [...prev, targetId]);
    } else {
      setSelectedTargetIds((prev) => prev.filter((id) => id !== targetId));
    }
  };

  const handleSelectAll = () => {
    setSelectedTargetIds(targets.map((t) => t.id));
  };

  const handleClearSelection = () => {
    setSelectedTargetIds([]);
  };

  if (currentStep === 'confirm') {
    return (
      <PMVStack gap={4} align="stretch">
        <PMAlert.Root status="warning">
          <PMAlert.Indicator />
          <PMAlert.Title>
            {PACKAGE_MESSAGES.removal.confirmMessage(
              selectedPackage.name,
              selectedTargetIds.length,
            )}
          </PMAlert.Title>
        </PMAlert.Root>
        <PMText fontSize="sm" color="tertiary">
          This will remove the package files from the selected targets. The
          package will still be available in Packmind for future deployments.
        </PMText>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={2} align="stretch" height="full">
      <PMText fontSize="sm" color="secondary">
        {PACKAGE_MESSAGES.removal.selectTargetsPrompt}
      </PMText>
      <PMHStack>
        <PMButtonGroup size="xs">
          <PMButton variant="secondary" onClick={handleSelectAll}>
            Select All
          </PMButton>
          <PMButton variant="secondary" onClick={handleClearSelection}>
            Clear Selection
          </PMButton>
        </PMButtonGroup>
      </PMHStack>
      <PMBox maxHeight="lg" overflow="auto">
        {Object.entries(groupedTargets).map(([repoKey, repoTargets]) => (
          <PMVStack key={repoKey} align="stretch" gap={1} mb={4}>
            <PMHeading level="h6" mb={1}>
              {repoKey}
            </PMHeading>
            <PMVStack mb={2}>
              {repoTargets.map((target) => {
                const distribution = distributions.find(
                  (d) => d.target.id === target.id,
                );
                const gitRepo = (
                  distribution?.target as {
                    gitRepo?: { branch: string };
                  }
                )?.gitRepo;

                return (
                  <PMCheckbox
                    key={target.id}
                    value={target.id}
                    checked={selectedTargetIds.includes(target.id)}
                    controlProps={{ borderColor: 'border.checkbox' }}
                    padding={2}
                    gap={4}
                    size="sm"
                    border="solid 1px"
                    borderColor="border.tertiary"
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
                        {gitRepo?.branch && (
                          <PMBadge size="sm">Branch: {gitRepo.branch}</PMBadge>
                        )}
                        <PMBadge size="sm">Path: {target.path}</PMBadge>
                      </PMHStack>
                    </PMVStack>
                  </PMCheckbox>
                );
              })}
            </PMVStack>
          </PMVStack>
        ))}
      </PMBox>
    </PMVStack>
  );
};
