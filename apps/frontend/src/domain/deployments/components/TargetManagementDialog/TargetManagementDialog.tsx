import React, { useState, useEffect, useMemo } from 'react';
import {
  PMButton,
  PMDialog,
  PMPortal,
  PMCloseButton,
  PMHeading,
  PMVStack,
  PMHStack,
  PMText,
  PMEmptyState,
  PMSpinner,
  PMAlertDialog,
  PMFlex,
} from '@packmind/ui';
import { GitRepoId } from '@packmind/types';
import { Target } from '@packmind/types';
import { LuSettings } from 'react-icons/lu';
import {
  useGetTargetsByOrganizationQuery,
  useDeleteTargetMutation,
} from '../../api/queries/DeploymentsQueries';
import { useAuthContext } from '../../../accounts/hooks';
import { useGetGitReposQuery } from '../../../git/api/queries/GitRepoQueries';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { TargetBadge } from '../TargetBadge/TargetBadge';
import { TargetForm } from '../TargetForm/TargetForm';

export interface TargetManagementDialogProps {
  gitRepoId: GitRepoId;
  repositoryName: string;
  owner: string;
  repo: string;
  branch?: string;
  trigger?: React.ReactNode;
  selectedTargetId?: string;
  onTargetSelected?: (target: Target) => void;
}

export const TargetManagementDialog: React.FC<TargetManagementDialogProps> = ({
  gitRepoId,
  repositoryName,
  owner,
  repo,
  branch,
  trigger,
  selectedTargetId,
  onTargetSelected,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<Target | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useAuthContext(); // Ensure user is authenticated

  const {
    data: allTargetsWithRepository = [],
    isLoading,
    isError,
    error,
  } = useGetTargetsByOrganizationQuery();

  const { data: repositories = [] } = useGetGitReposQuery();
  const { data: providersResponse } = useGetGitProvidersQuery();
  const providers = providersResponse?.providers ?? [];

  // Filter targets for this specific repository (owner/repo) across all branches
  const repositoryTargets = allTargetsWithRepository.filter(
    (targetWithRepo) =>
      targetWithRepo.repository.owner === owner &&
      targetWithRepo.repository.repo === repo,
  );

  // Convert to plain Target objects for compatibility with existing logic
  const targets: Target[] = useMemo(
    () => repositoryTargets.map(({ repository, ...target }) => target),
    [repositoryTargets],
  );

  // Create branch options for the TargetForm
  const availableBranches = useMemo(
    () =>
      repositoryTargets
        .reduce(
          (uniqueBranches, targetWithRepo) => {
            if (
              !uniqueBranches.some((b) => b.value === targetWithRepo.gitRepoId)
            ) {
              uniqueBranches.push({
                label: targetWithRepo.repository.branch,
                value: targetWithRepo.gitRepoId,
                branch: targetWithRepo.repository.branch,
              });
            }
            return uniqueBranches;
          },
          [] as Array<{ label: string; value: GitRepoId; branch: string }>,
        )
        .sort((a, b) => a.branch.localeCompare(b.branch)),
    [repositoryTargets],
  );

  const deleteTargetMutation = useDeleteTargetMutation();

  // Check if a target's provider has a token
  const canEditTargetPath = (targetGitRepoId: GitRepoId): boolean => {
    const repository = repositories.find((r) => r.id === targetGitRepoId);
    if (!repository) return true; // Default to allowing edit if repo not found

    const provider = providers.find((p) => p.id === repository.providerId);
    if (!provider) return true; // Default to allowing edit if provider not found

    return provider.hasToken;
  };

  // Sort targets with Root target first, then by creation date
  const sortedTargets = useMemo(
    () =>
      [...targets].sort((a, b) => {
        // Root target (path '/') always comes first
        if (a.path === '/') return -1;
        if (b.path === '/') return 1;

        // Sort others by creation date (assuming newer targets have higher IDs for now)
        return a.name.localeCompare(b.name);
      }),
    [targets],
  );

  // Handle selectedTargetId prop - open dialog and select target for editing
  useEffect(() => {
    if (selectedTargetId && allTargetsWithRepository.length > 0) {
      // Find target from the raw query data to avoid derived array dependencies
      const targetWithRepo = allTargetsWithRepository.find(
        (rt) => rt.id === selectedTargetId,
      );
      if (
        targetWithRepo &&
        targetWithRepo.repository.owner === owner &&
        targetWithRepo.repository.repo === repo
      ) {
        const { repository, ...targetToEdit } = targetWithRepo;
        setIsOpen(true);
        setSelectedTarget(targetToEdit as Target);
        setShowAddForm(false); // Ensure add form is hidden when editing
      }
    }
  }, [selectedTargetId, allTargetsWithRepository, owner, repo]);

  const handleDialogClose = () => {
    setIsOpen(false);
    setSelectedTarget(null);
    setShowAddForm(false);
    setDeletingTarget(null);
    setDeleteDialogOpen(false);

    // Notify parent that we're done with the target selection
    if (selectedTargetId && onTargetSelected && selectedTarget) {
      onTargetSelected(selectedTarget);
    }
  };

  const handleTargetDelete = (target: Target) => {
    // Close any open forms before showing delete dialog
    setShowAddForm(false);
    setSelectedTarget(null);

    setDeletingTarget(target);
    setDeleteDialogOpen(true);
  };

  const handleTargetClick = (target: Target) => {
    // If clicking on Root target (path '/'), just clear selection since it's not editable
    if (target.path === '/') {
      setSelectedTarget(null);
      return;
    }

    // Close add form if open and select the target for editing
    setShowAddForm(false);
    setSelectedTarget(target);
  };

  const confirmDeleteTarget = async () => {
    if (!deletingTarget) return;

    try {
      await deleteTargetMutation.mutateAsync({
        targetId: deletingTarget.id,
      });

      // If the deleted target was being edited, clear selection
      if (selectedTarget && selectedTarget.id === deletingTarget.id) {
        setSelectedTarget(null);
      }

      setDeleteDialogOpen(false);
      setDeletingTarget(null);
    } catch (error) {
      console.error('Error deleting target:', error);
      // Error handling is managed by the mutation hook
    }
  };

  const handleFormSuccess = () => {
    setSelectedTarget(null);
    setShowAddForm(false);
  };

  const handleFormCancel = () => {
    setSelectedTarget(null);
    setShowAddForm(false);
  };

  const defaultTrigger = (
    <PMButton size="sm" variant="outline" onClick={() => setIsOpen(true)}>
      <LuSettings />
      Manage Targets
    </PMButton>
  );

  return (
    <>
      <PMDialog.Root
        size="lg"
        placement="center"
        motionPreset="slide-in-bottom"
        scrollBehavior="outside"
        open={isOpen}
        onOpenChange={({ open }) => {
          if (open) {
            setIsOpen(true);
          } else {
            handleDialogClose();
          }
        }}
      >
        {trigger ? (
          <PMDialog.Trigger asChild>{trigger}</PMDialog.Trigger>
        ) : (
          defaultTrigger
        )}

        <PMPortal>
          <PMDialog.Backdrop />
          <PMDialog.Positioner>
            <PMDialog.Content>
              <PMDialog.Header>
                <PMDialog.Title asChild>
                  <PMHeading level="h2">{repositoryName} targets</PMHeading>
                </PMDialog.Title>
                <PMDialog.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDialog.CloseTrigger>
              </PMDialog.Header>

              <PMDialog.Body>
                <PMVStack gap={6} align="stretch">
                  {/* Loading State */}
                  {isLoading && (
                    <PMVStack gap={3} align="center" py={8}>
                      <PMSpinner size="lg" />
                      <PMText color="secondary">Loading targets...</PMText>
                    </PMVStack>
                  )}

                  {/* Error State */}
                  {isError && (
                    <PMText color="error" textAlign="center" py={4}>
                      {error instanceof Error
                        ? error.message
                        : 'Failed to load targets'}
                    </PMText>
                  )}

                  {/* Always show targets list */}
                  {!isLoading && !isError && (
                    <PMVStack gap={3} align="stretch">
                      <PMHStack justify="space-between" align="center">
                        <PMText
                          fontSize="sm"
                          fontWeight="medium"
                          color="primary"
                        >
                          Targets ({targets.length})
                        </PMText>
                        {!showAddForm && !selectedTarget && (
                          <PMButton
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTarget(null);
                              setShowAddForm(true);
                            }}
                          >
                            Add Target
                          </PMButton>
                        )}
                      </PMHStack>

                      {/* Targets Display */}
                      {sortedTargets.length > 0 ? (
                        <PMFlex gap={2} wrap="wrap">
                          {sortedTargets.map((target) => {
                            // Find the corresponding repository target to get branch info
                            const targetWithRepo = repositoryTargets.find(
                              (rt) => rt.id === target.id,
                            );
                            return (
                              <TargetBadge
                                key={target.id}
                                target={target}
                                branch={targetWithRepo?.repository.branch}
                                variant="subtle"
                                showActions={true}
                                showEditAction={false}
                                clickable={target.path !== '/'}
                                onDelete={handleTargetDelete}
                                onClick={handleTargetClick}
                              />
                            );
                          })}
                        </PMFlex>
                      ) : (
                        <PMEmptyState
                          title="No targets configured"
                          description="Add your first target to start deploying recipes and standards"
                        />
                      )}

                      {/* Add Target Form - shown when adding */}
                      {showAddForm && (
                        <PMVStack gap={3} align="stretch">
                          <PMText
                            fontSize="sm"
                            fontWeight="medium"
                            color="primary"
                          >
                            Add New Target
                          </PMText>
                          <TargetForm
                            mode="add"
                            gitRepoId={gitRepoId}
                            availableBranches={availableBranches}
                            defaultBranch={availableBranches[0]?.branch}
                            onSuccess={handleFormSuccess}
                            onCancel={handleFormCancel}
                          />
                        </PMVStack>
                      )}

                      {/* Edit Target Form - shown when editing */}
                      {selectedTarget && (
                        <PMVStack gap={3} align="stretch">
                          <PMText
                            fontSize="sm"
                            fontWeight="medium"
                            color="primary"
                          >
                            Edit Target: {selectedTarget.name}
                          </PMText>
                          <TargetForm
                            mode="edit"
                            target={selectedTarget}
                            gitRepoId={
                              repositoryTargets.find(
                                (rt) => rt.id === selectedTarget.id,
                              )?.gitRepoId || gitRepoId
                            }
                            availableBranches={availableBranches}
                            defaultBranch={availableBranches[0]?.branch}
                            canEditPath={canEditTargetPath(
                              repositoryTargets.find(
                                (rt) => rt.id === selectedTarget.id,
                              )?.gitRepoId || gitRepoId,
                            )}
                            onSuccess={handleFormSuccess}
                            onCancel={handleFormCancel}
                          />
                        </PMVStack>
                      )}
                    </PMVStack>
                  )}
                </PMVStack>
              </PMDialog.Body>
            </PMDialog.Content>
          </PMDialog.Positioner>
        </PMPortal>
      </PMDialog.Root>

      {/* Delete Confirmation Dialog */}
      <PMAlertDialog
        trigger={<div />} // Hidden trigger, controlled by state
        title="Delete Target"
        message={
          deletingTarget
            ? `Are you sure you want to delete "${deletingTarget.name}"? This action cannot be undone and will affect any deployments using this target.`
            : 'Are you sure you want to delete this target?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmColorScheme="red"
        onConfirm={confirmDeleteTarget}
        open={deleteDialogOpen}
        onOpenChange={(details) => setDeleteDialogOpen(details.open)}
        isLoading={deleteTargetMutation.isPending}
      />
    </>
  );
};
