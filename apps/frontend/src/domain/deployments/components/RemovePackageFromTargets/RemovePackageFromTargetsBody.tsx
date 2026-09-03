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
  PMAlert,
} from '@packmind/ui';
import { Distribution, TargetId } from '@packmind/types';
import { useRemovePackageFromTargetsContext } from './RemovePackageFromTargets';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import {
  isRootTargetPath,
  multiLandingRepoIds,
  targetLabel,
} from '../redesign/selectors/installDriftEntries';

/**
 * One row per distribution, which is what this dialog acts on: a package can be
 * taken out of one place in a repository without leaving the repository.
 *
 * Named by repository rather than by target, with the target added only where
 * the repository holds more than one. It read the other way round before, a
 * repository heading over rows named `default` carrying a `Path: /` badge, so a
 * single-place repository said the same thing three times.
 */
type RemovableDistribution = {
  targetId: TargetId;
  repoId: string;
  /** `owner/repo`, or the target's own name when the repo did not come back. */
  title: string;
  branch: string | null;
  targetName: string;
};

function removableDistributions(
  distributions: Distribution[],
): RemovableDistribution[] {
  const byTarget = new Map<TargetId, RemovableDistribution>();

  for (const distribution of distributions) {
    const { target } = distribution;
    if (byTarget.has(target.id)) continue;

    const gitRepo = target.gitRepo;
    byTarget.set(target.id, {
      targetId: target.id,
      repoId: gitRepo?.id ?? target.gitRepoId,
      title: gitRepo ? `${gitRepo.owner}/${gitRepo.repo}` : target.name,
      branch: gitRepo?.branch ?? null,
      targetName: targetLabel({
        id: target.id,
        name: target.name,
        isDefault: isRootTargetPath(target.path),
      }),
    });
  }

  return Array.from(byTarget.values());
}

export const RemovePackageFromTargetsBodyImpl: React.FC = () => {
  const {
    distributions,
    selectedTargetIds,
    setSelectedTargetIds,
    currentStep,
    selectedPackage,
  } = useRemovePackageFromTargetsContext();

  const rows = useMemo(
    () => removableDistributions(distributions),
    [distributions],
  );

  const multiLandingRepos = useMemo(
    () =>
      multiLandingRepoIds(
        rows.map((row) => ({
          repo: { id: row.repoId },
          target: { id: row.targetId },
        })),
      ),
    [rows],
  );

  const handleCheckboxChange = (targetId: TargetId, checked: boolean) => {
    if (checked) {
      setSelectedTargetIds((prev) => [...prev, targetId]);
    } else {
      setSelectedTargetIds((prev) => prev.filter((id) => id !== targetId));
    }
  };

  const handleSelectAll = () => {
    setSelectedTargetIds(rows.map((row) => row.targetId));
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
          This will remove the package files from the selected distributions.
          The package will still be available in Packmind for future
          distributions.
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
            Select all
          </PMButton>
          <PMButton variant="secondary" onClick={handleClearSelection}>
            Clear selection
          </PMButton>
        </PMButtonGroup>
      </PMHStack>
      <PMBox maxHeight="lg" overflow="auto">
        <PMVStack align="stretch" gap={1}>
          {rows.map((row) => {
            const showTarget = multiLandingRepos.has(row.repoId);

            return (
              <PMCheckbox
                key={row.targetId}
                value={row.targetId}
                checked={selectedTargetIds.includes(row.targetId)}
                controlProps={{ borderColor: 'border.checkbox' }}
                padding={2}
                gap={4}
                size="sm"
                border="solid 1px"
                borderColor="border.tertiary"
                width="full"
                onChange={(event) => {
                  // PMCheckbox spreads onChange onto Chakra's Root <label>, so the
                  // event is typed against the label while it actually bubbles up
                  // from the hidden <input> inside it.
                  const input = event.target as unknown as HTMLInputElement;
                  handleCheckboxChange(row.targetId, input.checked);
                }}
                _checked={{ bg: 'blue.900', borderColor: 'blue.500' }}
              >
                <PMVStack align="flex-start" gap={2}>
                  <PMText fontWeight="medium" fontSize="sm">
                    {row.title}
                  </PMText>
                  <PMHStack>
                    {row.branch && (
                      <PMBadge size="sm">Branch: {row.branch}</PMBadge>
                    )}
                    {showTarget && (
                      <PMBadge size="sm">{row.targetName}</PMBadge>
                    )}
                  </PMHStack>
                </PMVStack>
              </PMCheckbox>
            );
          })}
        </PMVStack>
      </PMBox>
    </PMVStack>
  );
};
