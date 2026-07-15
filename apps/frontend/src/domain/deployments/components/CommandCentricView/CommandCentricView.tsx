import React from 'react';
import {
  PMBox,
  PMHeading,
  PMVStack,
  PMText,
  PMEmptyState,
  PMBadge,
  PMHStack,
  PMIcon,
} from '@packmind/ui';
import {
  DeploymentItem,
  DeploymentEntry,
} from '../DeploymentItem/DeploymentItem';
import {
  CommandDeploymentStatus,
  TargetDeploymentInfo,
  RepositoryDeploymentInfo,
} from '@packmind/types';
import { LuCircleCheckBig, LuClockAlert } from 'react-icons/lu';

interface CommandCentricViewProps {
  recipes: CommandDeploymentStatus[];
  searchTerm?: string;
  showOnlyOutdated?: boolean;
  showOnlyUndeployed?: boolean;
}

export const CommandCentricView: React.FC<CommandCentricViewProps> = ({
  recipes,
  searchTerm = '',
  showOnlyOutdated = false,
  showOnlyUndeployed = false,
}) => {
  const filteredCommands = recipes.filter((commandDeployment) => {
    // Apply search filter
    if (searchTerm) {
      const commandName = commandDeployment.recipe.name.toLowerCase();
      if (!commandName.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Apply outdated filter
    if (showOnlyOutdated && !commandDeployment.hasOutdatedDeployments) {
      return false;
    }

    // Apply undeployed filter
    if (showOnlyUndeployed && commandDeployment.deployments.length > 0) {
      return false;
    }

    return true;
  });

  if (filteredCommands.length === 0) {
    if (searchTerm) {
      return (
        <PMEmptyState
          title="No recipes found"
          description={`No recipes match your search "${searchTerm}"`}
        />
      );
    }

    if (showOnlyOutdated) {
      return (
        <PMEmptyState
          title="No outdated recipes"
          description="All recipes have up-to-date deployments"
        />
      );
    }

    if (showOnlyUndeployed) {
      return (
        <PMEmptyState
          title="No undeployed recipes"
          description="All recipes have been distributed to at least one repository"
        />
      );
    }

    return (
      <PMEmptyState
        title="No recipes"
        description="No recipes found in your organization"
      />
    );
  }

  return (
    <PMVStack gap={2} align="stretch">
      {filteredCommands.map((commandDeployment) => {
        // Use target-based deployments if available, fallback to repository-based
        const deployments =
          commandDeployment.targetDeployments?.length > 0
            ? commandDeployment.targetDeployments
            : commandDeployment.deployments;

        // Type guard to check if deployment has target field
        const hasTarget = (
          deployment: TargetDeploymentInfo | RepositoryDeploymentInfo,
        ): deployment is TargetDeploymentInfo => {
          return 'target' in deployment;
        };

        // Separate outdated and up-to-date deployments
        const outdatedDeployments = deployments.filter(
          (deployment) => !deployment.isUpToDate,
        );
        const upToDateDeployments = deployments.filter(
          (deployment) => deployment.isUpToDate,
        );

        return (
          <PMVStack
            key={commandDeployment.recipe.id}
            p={4}
            borderWidth={1}
            borderRadius="md"
            backgroundColor={'background.primary'}
            alignItems={'stretch'}
            gap={'6'}
          >
            <PMHeading level="h4">{commandDeployment.recipe.name}</PMHeading>

            {/* Group deployments by repository */}
            {(() => {
              // Build grouping by repository
              const repoMap = new Map<
                string,
                {
                  owner: string;
                  repo: string;
                  branch: string;
                  outdated: (TargetDeploymentInfo | RepositoryDeploymentInfo)[];
                  upToDate: (TargetDeploymentInfo | RepositoryDeploymentInfo)[];
                }
              >();

              deployments.forEach((deployment) => {
                const repoId = deployment.gitRepo.id;
                let group = repoMap.get(repoId);
                if (!group) {
                  group = {
                    owner: deployment.gitRepo.owner,
                    repo: deployment.gitRepo.repo,
                    branch: deployment.gitRepo.branch,
                    outdated: [],
                    upToDate: [],
                  };
                  repoMap.set(repoId, group);
                }
                if (deployment.isUpToDate) {
                  group.upToDate.push(deployment);
                } else {
                  group.outdated.push(deployment);
                }
              });

              if (deployments.length === 0) {
                return (
                  <PMBox>
                    <PMBox mb={2}>
                      <PMText variant="body" color="faded">
                        This recipe has not been distributed yet
                      </PMText>
                    </PMBox>
                  </PMBox>
                );
              }

              return Array.from(repoMap.entries()).map(([repoId, group]) => (
                <PMBox
                  key={repoId}
                  border={'solid 1px'}
                  borderColor={'border.tertiary'}
                  borderRadius={'sm'}
                  padding={4}
                >
                  <PMVStack align="stretch" gap={3}>
                    <PMHeading level="h5" color={'secondary'}>
                      {group.owner}/{group.repo}:{group.branch}
                    </PMHeading>

                    {/* Outdated deployments for this repo */}
                    {group.outdated.length > 0 && (
                      <PMBox>
                        <DeploymentItem
                          title={
                            <PMHStack gap="1">
                              <PMIcon color={'text.warning'}>
                                <LuClockAlert />
                              </PMIcon>
                              <PMText>Outdated</PMText>
                            </PMHStack>
                          }
                        >
                          {group.outdated.map((deployment) => (
                            <DeploymentEntry
                              key={
                                hasTarget(deployment)
                                  ? deployment.target.id
                                  : `${repoId}-recipe`
                              }
                              name={
                                hasTarget(deployment) ? (
                                  <PMVStack
                                    align="flex-start"
                                    gap={0.5}
                                    flex={1}
                                  >
                                    <PMHeading level="h5" color="secondary">
                                      {deployment.target.name}
                                    </PMHeading>
                                    <PMHeading
                                      level="h6"
                                      color="faded"
                                      textAlign="left"
                                    >
                                      Path: {deployment.target.path}
                                    </PMHeading>
                                  </PMVStack>
                                ) : (
                                  <PMHStack alignItems={'baseline'}>
                                    <PMBadge>Recipe</PMBadge>
                                  </PMHStack>
                                )
                              }
                              versionInfo={`Current: v${deployment.deployedVersion.version} → Latest: v${commandDeployment.latestVersion.version}`}
                            />
                          ))}
                        </DeploymentItem>
                      </PMBox>
                    )}

                    {/* Up-to-date deployments for this repo */}
                    {group.upToDate.length > 0 && (
                      <PMBox>
                        <DeploymentItem
                          title={
                            <PMHStack gap="1">
                              <PMIcon color={'text.success'}>
                                <LuCircleCheckBig />
                              </PMIcon>
                              <PMText>Up-to-date</PMText>
                            </PMHStack>
                          }
                        >
                          {group.upToDate.map((deployment) => (
                            <DeploymentEntry
                              key={
                                hasTarget(deployment)
                                  ? deployment.target.id
                                  : `${repoId}-recipe`
                              }
                              name={
                                hasTarget(deployment) ? (
                                  <PMVStack
                                    align="flex-start"
                                    gap={0.5}
                                    flex={1}
                                  >
                                    <PMHeading level="h5" color="secondary">
                                      {deployment.target.name}
                                    </PMHeading>
                                    <PMHeading
                                      level="h6"
                                      color="faded"
                                      textAlign="left"
                                    >
                                      Path: {deployment.target.path}
                                    </PMHeading>
                                  </PMVStack>
                                ) : (
                                  <PMHStack alignItems={'baseline'}>
                                    <PMBadge>Recipe</PMBadge>
                                  </PMHStack>
                                )
                              }
                              versionInfo={`Version: v${deployment.deployedVersion.version}`}
                            />
                          ))}
                        </DeploymentItem>
                      </PMBox>
                    )}
                  </PMVStack>
                </PMBox>
              ));
            })()}
          </PMVStack>
        );
      })}
    </PMVStack>
  );
};
