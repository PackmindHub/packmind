import React, { useState } from 'react';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMButton,
  PMText,
  PMInput,
  PMField,
  PMEmptyState,
  PMSpinner,
  PMAlert,
  PMGrid,
  PMGridItem,
  pmToaster,
} from '@packmind/ui';
import {
  useGetAvailableRepositoriesQuery,
  useAddRepositoryMutation,
} from '../../api/queries';
import {
  GitProviderUI,
  AvailableRepository,
  AddRepositoryForm,
} from '../../types/GitProviderTypes';
import { extractErrorMessage } from '../../utils/errorUtils';
import { GIT_MESSAGES } from '../../constants/messages';

interface RepositorySelectorProps {
  provider: GitProviderUI;
}

export const RepositorySelector: React.FC<RepositorySelectorProps> = ({
  provider,
}) => {
  const [selectedRepo, setSelectedRepo] = useState<AvailableRepository | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [branchOption, setBranchOption] = useState<'default' | 'custom'>(
    'default',
  );
  const [customBranch, setCustomBranch] = useState('');

  const {
    data: availableRepos,
    isLoading: reposLoading,
    isError: reposError,
  } = useGetAvailableRepositoriesQuery(provider.id);

  const addRepositoryMutation = useAddRepositoryMutation();

  // Filter repositories based on search term
  const filteredRepos =
    availableRepos?.filter(
      (repo) =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.fullName.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  const handleAddRepository = async () => {
    if (!selectedRepo) return;

    const selectedBranch =
      branchOption === 'default' ? selectedRepo.defaultBranch : customBranch;

    if (!selectedBranch.trim()) {
      console.error('Branch name is required');
      return;
    }

    const formData: AddRepositoryForm = {
      owner: selectedRepo.owner,
      name: selectedRepo.name,
      branch: selectedBranch,
    };

    addRepositoryMutation.mutate(
      {
        providerId: provider.id,
        data: formData,
      },
      {
        onSuccess: () => {
          pmToaster.create({
            type: 'success',
            title: 'Success',
            description: GIT_MESSAGES.success.repositoryAdded,
          });

          // Reset form state
          setSelectedRepo(null);
          setSearchTerm('');
          setBranchOption('default');
          setCustomBranch('');
        },
      },
    );
  };

  const handleRepoSelect = (repo: AvailableRepository) => {
    setSelectedRepo(repo);
    setBranchOption('default'); // Reset to default branch when repo changes
    setCustomBranch(''); // Clear custom branch input
  };

  if (reposLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading available repositories..."
        description={`Fetching repositories from ${provider.source.toUpperCase()}...`}
      ></PMEmptyState>
    );
  }

  if (reposError) {
    return (
      <PMAlert.Root status="error" my={4}>
        <PMAlert.Indicator />
        <PMAlert.Title>Error loading repositories</PMAlert.Title>
        <PMAlert.Description>
          Failed to fetch repositories from {provider.source.toUpperCase()}.
          Check your token and try again.
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  return (
    <PMGrid gridTemplateColumns={'1fr minmax(0, 400px)'} gap={8}>
      <PMGridItem>
        <PMVStack align="stretch" gap={8} mt={4}>
          <PMField.Root>
            <PMField.Label color={'text.secondary'}>Search</PMField.Label>
            <PMInput
              id="repo-search"
              placeholder="Search by repository name or owner..."
              value={searchTerm}
              onChange={(e: {
                target: { value: React.SetStateAction<string> };
              }) => setSearchTerm(e.target.value)}
              size={'xs'}
            />
          </PMField.Root>

          {/* Repository List */}
          <PMVStack align="stretch" gap={2}>
            <PMText variant="body-important" color={'secondary'}>
              Available Repositories ({filteredRepos.length})
            </PMText>
            <PMBox>
              {filteredRepos.length === 0 ? (
                <PMEmptyState
                  title={
                    searchTerm
                      ? 'No repositories found matching your search.'
                      : 'No repositories available.'
                  }
                ></PMEmptyState>
              ) : (
                <PMVStack gap={2} alignItems={'stretch'}>
                  {filteredRepos.map((repo) => (
                    <PMBox
                      key={repo.fullName}
                      p={2}
                      border="1px solid"
                      borderColor={
                        selectedRepo?.fullName === repo.fullName
                          ? 'blue.500'
                          : 'gray.700'
                      }
                      cursor="pointer"
                      _hover={{ borderColor: 'blue.300', bg: 'blue.900' }}
                      onClick={() => handleRepoSelect(repo)}
                      width={'full'}
                    >
                      <PMVStack align="start" gap={1}>
                        <PMText variant="small-important">{repo.name}</PMText>
                        <PMText variant="small" color="secondary">
                          {repo.fullName}
                        </PMText>
                      </PMVStack>
                    </PMBox>
                  ))}
                </PMVStack>
              )}
            </PMBox>
          </PMVStack>
        </PMVStack>
      </PMGridItem>

      {selectedRepo && (
        <PMGridItem>
          <PMBox position="sticky" top={0} zIndex={1}>
            <PMVStack align="stretch" gap={3}>
              <PMText variant="body-important" color="secondary">
                Branch for {selectedRepo.name}
              </PMText>

              {/* Default Branch Option */}
              <PMHStack gap={3}>
                <input
                  type="radio"
                  id="default-branch"
                  name="branch-option"
                  value="default"
                  checked={branchOption === 'default'}
                  onChange={(e) =>
                    setBranchOption(e.target.value as 'default' | 'custom')
                  }
                />
                <label htmlFor="default-branch" style={{ cursor: 'pointer' }}>
                  <PMText variant="body">
                    Use default branch:{' '}
                    <strong>{selectedRepo.defaultBranch}</strong>
                  </PMText>
                </label>
              </PMHStack>

              {/* Custom Branch Option */}
              <PMVStack align="stretch" gap={2}>
                <PMHStack gap={3}>
                  <input
                    type="radio"
                    id="custom-branch"
                    name="branch-option"
                    value="custom"
                    checked={branchOption === 'custom'}
                    onChange={(e) =>
                      setBranchOption(e.target.value as 'default' | 'custom')
                    }
                  />
                  <label htmlFor="custom-branch" style={{ cursor: 'pointer' }}>
                    <PMText variant="body">Use custom branch</PMText>
                  </label>
                </PMHStack>

                {branchOption === 'custom' && (
                  <PMBox>
                    <PMInput
                      placeholder="Enter branch name (e.g., main, feature/branch-name)"
                      value={customBranch}
                      onChange={(e: {
                        target: { value: React.SetStateAction<string> };
                      }) => setCustomBranch(e.target.value)}
                      disabled={addRepositoryMutation.isPending}
                      size={'xs'}
                      width="sm"
                      maxLength={100}
                    />
                  </PMBox>
                )}
              </PMVStack>

              {/* Error Display */}
              {addRepositoryMutation.isError && (
                <PMAlert.Root status="error">
                  <PMAlert.Indicator />
                  <PMAlert.Title>Failed to add repository</PMAlert.Title>
                  <PMAlert.Description>
                    {extractErrorMessage(
                      addRepositoryMutation.error,
                      'An error occurred while adding the repository. Please try again.',
                    )}
                  </PMAlert.Description>
                </PMAlert.Root>
              )}

              <PMHStack justify="flex-start">
                <PMButton
                  onClick={handleAddRepository}
                  size={'sm'}
                  disabled={
                    !selectedRepo ||
                    addRepositoryMutation.isPending ||
                    (branchOption === 'custom' && !customBranch.trim())
                  }
                  loading={addRepositoryMutation.isPending}
                >
                  Add repository
                </PMButton>
              </PMHStack>
            </PMVStack>
          </PMBox>
        </PMGridItem>
      )}
    </PMGrid>
  );
};
