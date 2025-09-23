import React, { useCallback, useMemo } from 'react';
import {
  PMAlert,
  PMButton,
  PMDataList,
  PMEmptyState,
  PMHeading,
  PMPageSection,
  PMSpinner,
  PMBox,
  PMVStack,
  PMHStack,
  PMText,
} from '@packmind/ui';

import { useGetTargetsByOrganizationQuery } from '../../api/queries/DeploymentsQueries';
import { TargetWithRepository } from '@packmind/shared';
import { Standard } from '@packmind/standards/types';
import { OrganizationId } from '@packmind/accounts';

export interface DeployToTargetsProps {
  disabled?: boolean;
  loading?: boolean;
  standard: Standard;
  organizationId: OrganizationId;
  onDeploy: (targets: TargetWithRepository[]) => void;
}

export const DeployToTargets: React.FC<DeployToTargetsProps> = ({
  disabled = false,
  loading = false,
  standard,
  organizationId,
  onDeploy,
}) => {
  const {
    data: targets = [],
    isLoading: targetsLoading,
    isError: targetsError,
  } = useGetTargetsByOrganizationQuery(organizationId);

  const defaultPath = `.packmind/standards/${standard.slug}.md`;

  const handleTargetDeploy = useCallback(
    (target: TargetWithRepository) => {
      onDeploy([target]);
    },
    [onDeploy],
  );

  const handleDeployAll = useCallback(() => {
    if (targets.length > 0) {
      onDeploy(targets);
    } else {
      console.warn('No targets available for deployment');
    }
  }, [onDeploy, targets]);

  const content = useMemo(
    () => (
      <PMBox w="100%">
        {targetsError && (
          <PMAlert.Root status="error" mb={3} p={2}>
            <PMAlert.Content>Failed to load targets</PMAlert.Content>
          </PMAlert.Root>
        )}

        {targetsLoading && (
          <PMAlert.Root status="neutral" mb={3} p={2}>
            <PMAlert.Indicator>
              <PMSpinner size="sm" />
            </PMAlert.Indicator>
            <PMAlert.Content>Loading targets...</PMAlert.Content>
          </PMAlert.Root>
        )}

        {targets.length === 0 && !targetsLoading && (
          <PMEmptyState
            title={'No targets configured'}
            description="Configure deployment targets in your repositories to deploy changes."
          />
        )}

        <PMBox
          padding={4}
          border={'solid 1px'}
          borderColor="border.secondary"
          borderRadius="md"
          mb={6}
          mt={2}
        >
          <PMHeading level="h5">Target file information</PMHeading>
          <PMDataList
            my={2}
            flexDirection={'row'}
            size={'sm'}
            gap={6}
            items={[
              { label: 'Path', value: defaultPath },
              { label: 'Scope', value: standard.scope || '**/*' },
            ]}
          />
        </PMBox>

        <PMVStack align="stretch" gap={2} my={2}>
          {[...targets]
            .sort((a, b) => {
              const ownerCompare = a.repository.owner.localeCompare(
                b.repository.owner,
              );
              if (ownerCompare !== 0) return ownerCompare;
              const repoCompare = a.repository.repo.localeCompare(
                b.repository.repo,
              );
              if (repoCompare !== 0) return repoCompare;
              const branchCompare = a.repository.branch.localeCompare(
                b.repository.branch,
              );
              if (branchCompare !== 0) return branchCompare;
              return a.name.localeCompare(b.name);
            })
            .map((target) => (
              <PMHStack
                justify="space-between"
                align="flex-start"
                key={target.id}
                p={3}
                border="1px solid"
                borderColor="border.secondary"
                borderRadius="md"
              >
                <PMVStack align="flex-start" gap={0.5} flex={1}>
                  <PMText fontWeight="medium" fontSize="sm">
                    {target.name}
                  </PMText>
                  <PMText fontSize="xs" textAlign="left" color="gray.600">
                    {target.repository.owner}/{target.repository.repo}:
                    {target.repository.branch}
                  </PMText>
                  <PMText fontSize="xs" textAlign="left">
                    Path: {target.path}
                  </PMText>
                </PMVStack>
                <PMButton
                  size="sm"
                  variant="outline"
                  onClick={() => handleTargetDeploy(target)}
                  disabled={disabled || loading || targetsLoading}
                >
                  Deploy
                </PMButton>
              </PMHStack>
            ))}
        </PMVStack>
      </PMBox>
    ),
    [
      targetsError,
      targetsLoading,
      targets,
      defaultPath,
      standard.scope,
      disabled,
      loading,
      handleTargetDeploy,
    ],
  );

  return (
    <PMPageSection
      title="Run deployment"
      backgroundColor="primary"
      headingLevel="h4"
      cta={
        <PMButton
          variant="secondary"
          onClick={handleDeployAll}
          disabled={
            disabled || loading || targetsLoading || targets.length === 0
          }
        >
          Deploy to All Targets
        </PMButton>
      }
    >
      {content}
    </PMPageSection>
  );
};
