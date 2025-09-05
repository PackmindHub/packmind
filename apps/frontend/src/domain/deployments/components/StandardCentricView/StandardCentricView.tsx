import React from 'react';
import { PMBox, PMHeading, PMVStack, PMText, PMEmptyState } from '@packmind/ui';
import { StandardDeploymentStatus } from '@packmind/deployments';
import {
  DeploymentItem,
  DeploymentEntry,
} from '../DeploymentItem/DeploymentItem';

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
          description="All standards have been deployed to at least one repository"
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
        // Separate outdated and up-to-date deployments
        const outdatedDeployments = standardDeployment.deployments.filter(
          (deployment) => !deployment.isUpToDate,
        );
        const upToDateDeployments = standardDeployment.deployments.filter(
          (deployment) => deployment.isUpToDate,
        );

        return (
          <PMBox
            key={standardDeployment.standard.id}
            p={4}
            borderWidth={1}
            borderRadius="md"
            backgroundColor={'background.primary'}
          >
            <PMBox mb={3}>
              <PMHeading level="h4">
                {standardDeployment.standard.name}
              </PMHeading>
            </PMBox>

            {/* Outdated deployments first */}
            {outdatedDeployments.length > 0 && (
              <PMBox mb={4}>
                <DeploymentItem title="❌ Outdated">
                  {outdatedDeployments.map((deployment) => (
                    <DeploymentEntry
                      key={deployment.gitRepo.id}
                      name={`${deployment.gitRepo.owner}/${deployment.gitRepo.repo}`}
                      versionInfo={`Current: v${deployment.deployedVersion.version} → Latest: v${standardDeployment.latestVersion.version}`}
                    />
                  ))}
                </DeploymentItem>
              </PMBox>
            )}

            {/* Up-to-date deployments */}
            {upToDateDeployments.length > 0 && (
              <PMBox>
                <DeploymentItem title="✅ Up-to-date">
                  {upToDateDeployments.map((deployment) => (
                    <DeploymentEntry
                      key={deployment.gitRepo.id}
                      name={`${deployment.gitRepo.owner}/${deployment.gitRepo.repo}`}
                      versionInfo={`Version: v${deployment.deployedVersion.version}`}
                    />
                  ))}
                </DeploymentItem>
              </PMBox>
            )}

            {standardDeployment.deployments.length === 0 && (
              <PMBox>
                <PMBox mb={2}>
                  <PMText variant="body" color="faded">
                    This standard has not been deployed yet
                  </PMText>
                </PMBox>
              </PMBox>
            )}
          </PMBox>
        );
      })}
    </PMVStack>
  );
};
