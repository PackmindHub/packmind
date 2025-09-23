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
      <PMButtonGroup size={'xs'}>
        <PMButton
          variant="secondary"
          onClick={() =>
            setSelectedTargetIds(sortedTargets.map((target) => target.id))
          }
        >
          Select All
        </PMButton>
        <PMButton variant="secondary" onClick={() => setSelectedTargetIds([])}>
          Clear Selection
        </PMButton>
      </PMButtonGroup>
      <PMBox maxHeight="lg" overflow={'auto'}>
        {sortedTargets.map((target) => (
          <PMCheckbox
            key={target.id}
            value={target.id}
            checked={selectedTargetIds.includes(target.id)}
            controlProps={{ borderColor: 'border.checkbox' }}
            padding={2}
            gap={4}
            onChange={(event) => {
              const input = event.target as HTMLInputElement;
              handleCheckboxChange(target.id, input.checked);
            }}
          >
            <PMVStack align="flex-start" gap={0.5} flex={1}>
              <PMText fontWeight="medium" fontSize="sm">
                {target.name}
              </PMText>
              <PMText fontSize="xs" color="secondary" textAlign="left">
                {target.repository.owner}/{target.repository.repo}:
                {target.repository.branch}
              </PMText>
              <PMText fontSize="xs" color="secondary" textAlign="left">
                Path: {target.path}
              </PMText>
            </PMVStack>
          </PMCheckbox>
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
