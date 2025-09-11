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
import { GitRepoId } from '@packmind/git/types';

export const RunDistributionBodyImpl: React.FC = () => {
  const {
    repositoriesList,
    repositoriesLoading,
    repositoriesError,
    selectedRepoIds,
    setSelectedRepoIds,
    deploymentError,
  } = useRunDistribution();

  if (repositoriesLoading) return <PMSpinner />;
  if (repositoriesError)
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>
          Error while loading repositories. Please try again later
        </PMAlert.Title>
      </PMAlert.Root>
    );

  if (repositoriesList.length === 0)
    return (
      <PMEmptyState
        title="No repositories connected"
        description="Connect a repository to deploy recipes"
      />
    );

  const sortedRepositories = [...repositoriesList].sort((a, b) => {
    const ownerCompare = a.owner.localeCompare(b.owner);
    if (ownerCompare !== 0) return ownerCompare;
    return a.repo.localeCompare(b.repo);
  });

  const handleCheckboxChange = (repositoryId: GitRepoId, checked: boolean) => {
    if (checked) {
      setSelectedRepoIds((prev: GitRepoId[]) => [...prev, repositoryId]);
    } else {
      setSelectedRepoIds((prev: GitRepoId[]) =>
        prev.filter((id) => id !== repositoryId),
      );
    }
  };

  return (
    <PMVStack gap={2} align={'stretch'} height="full">
      <PMButtonGroup size={'xs'}>
        <PMButton
          variant="secondary"
          onClick={() =>
            setSelectedRepoIds(sortedRepositories.map((repo) => repo.id))
          }
        >
          Select All
        </PMButton>
        <PMButton variant="secondary" onClick={() => setSelectedRepoIds([])}>
          Clear Selection
        </PMButton>
      </PMButtonGroup>
      <PMBox maxHeight="lg" overflow={'auto'}>
        {sortedRepositories.map((repository) => (
          <PMCheckbox
            key={repository.id}
            value={repository.id}
            checked={selectedRepoIds.includes(repository.id)}
            controlProps={{ borderColor: 'border.checkbox' }}
            padding={2}
            gap={4}
            onChange={(event) => {
              const input = event.target as HTMLInputElement;
              handleCheckboxChange(repository.id, input.checked);
            }}
          >
            <PMVStack align="flex-start" gap={0.5} flex={1}>
              <PMText fontWeight="medium" fontSize="sm">
                {repository.owner}/{repository.repo}
              </PMText>
              <PMText fontSize="xs" color="secondary" textAlign="left">
                Branch: {repository.branch}
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
