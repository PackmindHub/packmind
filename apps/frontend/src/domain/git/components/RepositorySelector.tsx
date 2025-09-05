import React, { useState } from 'react';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMGrid,
  PMGridItem,
  PMButton,
  PMHeading,
  PMText,
  PMInput,
} from '@packmind/ui';
import {
  useGetAvailableRepositoriesQuery,
  useAddRepositoryMutation,
} from '../api/queries';
import {
  GitProviderUI,
  AvailableRepository,
  AddRepositoryForm,
} from '../types/GitProviderTypes';

interface RepositorySelectorProps {
  provider: GitProviderUI;
  onSuccess: () => void;
  onCancel: () => void;
}

export const RepositorySelector: React.FC<RepositorySelectorProps> = ({
  provider,
  onSuccess,
  onCancel,
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

    try {
      await addRepositoryMutation.mutateAsync({
        providerId: provider.id,
        data: formData,
      });
      console.log(`Repository "${selectedRepo.fullName}" added successfully`);
      onSuccess();
    } catch (error) {
      console.error('Failed to add repository:', error);
    }
  };

  const handleRepoSelect = (repo: AvailableRepository) => {
    setSelectedRepo(repo);
    setBranchOption('default'); // Reset to default branch when repo changes
    setCustomBranch(''); // Clear custom branch input
  };

  if (reposLoading) {
    return (
      <PMBox p={6} borderRadius="md" shadow="md">
        <PMHeading level="h2">Loading Available Repositories...</PMHeading>
        <PMText variant="body">
          Fetching repositories from {provider.source.toUpperCase()}...
        </PMText>
      </PMBox>
    );
  }

  if (reposError) {
    return (
      <PMBox p={6} borderRadius="md" shadow="md">
        <PMHeading level="h2">Error Loading Repositories</PMHeading>
        <PMText variant="body">
          Failed to fetch repositories from {provider.source.toUpperCase()}.
        </PMText>
        <PMHStack gap={3} mt={4}>
          <PMButton variant="outline" onClick={onCancel}>
            Cancel
          </PMButton>
        </PMHStack>
      </PMBox>
    );
  }

  return (
    <PMBox p={6} borderRadius="md" shadow="md">
      <PMVStack align="stretch" gap={4} mb={6}>
        <PMHeading level="h2">Add Repository</PMHeading>
        <PMText variant="body">
          Select a repository from {provider.source.toUpperCase()} and choose a
          branch to track.
        </PMText>
      </PMVStack>

      <PMVStack align="stretch" gap={6}>
        {/* Search and Filters */}
        <PMVStack align="stretch" gap={2}>
          <PMText>Search Repositories</PMText>
          <PMInput
            id="repo-search"
            placeholder="Search by repository name or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </PMVStack>

        {/* Repository List */}
        <PMVStack align="stretch" gap={2}>
          <PMText>Available Repositories ({filteredRepos.length})</PMText>
          <PMBox
            maxHeight="300px"
            overflowY="auto"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            p={2}
          >
            {filteredRepos.length === 0 ? (
              <PMBox p={4} textAlign="center">
                <PMText variant="body">
                  {searchTerm
                    ? 'No repositories found matching your search.'
                    : 'No repositories available.'}
                </PMText>
              </PMBox>
            ) : (
              <PMGrid templateColumns="1fr" gap={2}>
                {filteredRepos.map((repo) => (
                  <PMGridItem key={repo.fullName}>
                    <PMBox
                      p={3}
                      borderRadius="md"
                      border="2px solid"
                      borderColor={
                        selectedRepo?.fullName === repo.fullName
                          ? 'blue.500'
                          : 'gray.200'
                      }
                      cursor="pointer"
                      _hover={{ borderColor: 'blue.300', bg: 'blue.25' }}
                      onClick={() => handleRepoSelect(repo)}
                    >
                      <PMVStack align="start" gap={2}>
                        <PMHStack justify="space-between" width="100%">
                          <PMVStack align="start" gap={1}>
                            <PMText variant="body-important">
                              {repo.name}
                            </PMText>
                            <PMText variant="small">{repo.fullName}</PMText>
                          </PMVStack>
                          <PMHStack gap={2}>
                            {repo.language && (
                              <PMText variant="small">{repo.language}</PMText>
                            )}
                            {repo.stars > 0 && (
                              <PMHStack gap={1}>
                                <span role="img" aria-label="star">
                                  ⭐
                                </span>
                                <PMText variant="small">{repo.stars}</PMText>
                              </PMHStack>
                            )}
                            {repo.private && (
                              <PMText variant="small">Private</PMText>
                            )}
                          </PMHStack>
                        </PMHStack>
                        {repo.description && (
                          <PMText variant="small">{repo.description}</PMText>
                        )}
                      </PMVStack>
                    </PMBox>
                  </PMGridItem>
                ))}
              </PMGrid>
            )}
          </PMBox>
        </PMVStack>

        {/* Branch Selection */}
        {selectedRepo && (
          <PMVStack align="stretch" gap={3}>
            <PMText>Branch for {selectedRepo.name}</PMText>

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
                <PMBox pl={8}>
                  <PMInput
                    placeholder="Enter branch name (e.g., main, develop, feature/branch-name)"
                    value={customBranch}
                    onChange={(e) => setCustomBranch(e.target.value)}
                    disabled={addRepositoryMutation.isPending}
                  />
                  {customBranch.trim() && (
                    <PMText variant="small">Branch: {customBranch}</PMText>
                  )}
                </PMBox>
              )}
            </PMVStack>
          </PMVStack>
        )}

        {/* Action Buttons */}
        <PMHStack gap={3} justify="flex-end">
          <PMButton
            variant="outline"
            onClick={onCancel}
            disabled={addRepositoryMutation.isPending}
          >
            Cancel
          </PMButton>
          <PMButton
            colorScheme="blue"
            onClick={handleAddRepository}
            disabled={
              !selectedRepo ||
              addRepositoryMutation.isPending ||
              (branchOption === 'custom' && !customBranch.trim())
            }
            loading={addRepositoryMutation.isPending}
          >
            Add Repository
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
};
