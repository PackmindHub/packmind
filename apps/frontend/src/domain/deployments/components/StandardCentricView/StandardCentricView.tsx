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
import { StandardDeploymentStatus } from '@packmind/types';
import {
  TargetStandardDeploymentInfo,
  RepositoryStandardDeploymentInfo,
} from '@packmind/types';
import {
  DeploymentItem,
  DeploymentEntry,
} from '../DeploymentItem/DeploymentItem';
import { LuCircleCheckBig, LuClockAlert } from 'react-icons/lu';

interface StandardCentricViewProps {
  standards: StandardDeploymentStatus[];
  searchTerm?: string;
  showOnlyOutdated?: boolean;
  showOnlyUndeployed?: boolean;
}

export const StandardCentricView: React.FC<StandardCentricViewProps> = ({
  standards,
  searchTerm = '',
  showOnlyOutdated = false,
  showOnlyUndeployed = false,
}) => {
  const filteredStandards = standards.filter((standardDeployment) => {
    // Apply search filter
    if (searchTerm) {
      const standardName = standardDeployment.standard.name.toLowerCase();
      if (!standardName.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Apply outdated filter
    if (showOnlyOutdated && !standardDeployment.hasOutdatedDeployments) {
      return false;
    }

    // Apply undeployed filter
    if (showOnlyUndeployed && standardDeployment.deployments.length > 0) {
      return false;
    }

    return true;
  });

  if (filteredStandards.length === 0) {
    if (searchTerm) {
      return (
        <PMEmptyState
          title="No standards found"
          description={`No standards match your search "${searchTerm}"`}
        />
      );
    }

    if (showOnlyOutdated) {
      return (
        <PMEmptyState
          title="No outdated standards"
          description="All standards have up-to-date deployments"
        />
      );
    }

    if (showOnlyUndeployed) {
      return (
        <PMEmptyState
          title="No undeployed standards"
          description="All standards have been distributed to at least one repository"
        />
      );
    }

    return (
      <PMEmptyState
        title="No standards"
        description="No standards found in your organization"
      />
    );
  }

  return (
    <PMVStack gap={2} align="stretch">
      {filteredStandards.map((standardDeployment) => {
        // Use target-based deployments if available, fallback to repository-based
        const deployments =
          standardDeployment.targetDeployments?.length > 0
            ? standardDeployment.targetDeployments
            : standardDeployment.deployments;

        // Type guard to check if deployment has target field
        const hasTarget = (
          deployment:
            | TargetStandardDeploymentInfo
            | RepositoryStandardDeploymentInfo,
        ): deployment is TargetStandardDeploymentInfo => {
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
            key={standardDeployment.standard.id}
            p={4}
            borderWidth={1}
            borderRadius="md"
            backgroundColor={'background.primary'}
            alignItems={'stretch'}
            gap={'6'}
          >
            <PMHeading level="h4">{standardDeployment.standard.name}</PMHeading>

            {/* Group deployments by repository */}
            {(() => {
              // Build grouping by repository
              const repoMap = new Map<
                string,
                {
                  owner: string;
                  repo: string;
                  branch: string;
                  outdated: (
                    | TargetStandardDeploymentInfo
                    | RepositoryStandardDeploymentInfo
                  )[];
                  upToDate: (
                    | TargetStandardDeploymentInfo
                    | RepositoryStandardDeploymentInfo
                  )[];
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
                        This standard has not been distributed yet
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
                                  : `${repoId}-standard`
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
                                    <PMBadge color="blue.200">Standard</PMBadge>
                                  </PMHStack>
                                )
                              }
                              versionInfo={`Current: v${deployment.deployedVersion.version} → Latest: v${standardDeployment.latestVersion.version}`}
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
                                  : `${repoId}-standard`
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
                                    <PMBadge color="blue.200">Standard</PMBadge>
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
