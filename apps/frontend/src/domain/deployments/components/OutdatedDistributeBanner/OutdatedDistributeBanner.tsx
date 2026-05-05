import React, { useMemo } from 'react';
import { PMAlert, PMHStack } from '@packmind/ui';
import { ActiveDistributedPackagesByTarget } from '@packmind/types';
import { buildRepositorySections } from '../../utils/buildRepositorySections';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { BatchDistributeButton } from '../BatchDistributeButton/BatchDistributeButton';
import { DeployByTargetGroup } from '../../hooks/useDeployPackage';

export interface OutdatedDistributeBannerProps {
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>;
}

export const OutdatedDistributeBanner: React.FC<
  OutdatedDistributeBannerProps
> = ({ entries }) => {
  const { data: gitProvidersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();

  const providersWithToken = useMemo(() => {
    const set = new Set<string>();
    gitProvidersResponse?.providers
      .filter((provider) => provider.hasToken)
      .forEach((provider) => set.add(provider.id));
    return set;
  }, [gitProvidersResponse]);

  const sections = useMemo(
    () => buildRepositorySections({ entries }),
    [entries],
  );

  const { groups, hasOutdated, hasIneligibleTargets } = useMemo(() => {
    const collected: DeployByTargetGroup[] = [];
    let outdated = false;
    let ineligible = false;
    sections.forEach((section) => {
      const eligible = providersWithToken.has(section.gitRepo.providerId);
      section.targets.forEach((target) => {
        if (target.outdatedPackageIds.length === 0) return;
        outdated = true;
        if (eligible) {
          collected.push({
            targetId: target.id,
            packageIds: target.outdatedPackageIds,
          });
        } else {
          ineligible = true;
        }
      });
    });
    return {
      groups: collected,
      hasOutdated: outdated,
      hasIneligibleTargets: ineligible,
    };
  }, [sections, providersWithToken]);

  if (!hasOutdated) {
    return null;
  }

  return (
    <PMAlert.Root status="info">
      <PMHStack justify="space-between" align="center" width="full" gap={4}>
        <PMHStack>
          <PMAlert.Indicator />
          <PMAlert.Title>Some targets need distribution.</PMAlert.Title>
        </PMHStack>
        {!isProvidersLoading && (
          <BatchDistributeButton
            label="Distribute all"
            groups={groups}
            variant="primary"
            disabled={hasIneligibleTargets}
            disabledTooltip={
              hasIneligibleTargets
                ? 'Some targets are not configured for in-app distribution. Use packmind-cli to distribute.'
                : undefined
            }
          />
        )}
      </PMHStack>
    </PMAlert.Root>
  );
};
