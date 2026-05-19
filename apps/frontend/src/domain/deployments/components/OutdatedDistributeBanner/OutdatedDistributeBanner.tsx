import React, { useMemo } from 'react';
import { useParams } from 'react-router';
import { PMAlert, PMHStack, PMLink, PMVStack } from '@packmind/ui';
import {
  ActiveDistributedPackagesByTarget,
  DistributionStatus,
  PackageId,
} from '@packmind/types';
import { buildRepositorySections } from '../../utils/buildRepositorySections';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { BatchDistributeButton } from '../BatchDistributeButton/BatchDistributeButton';
import { DeployByTargetGroup } from '../../hooks/useDeployPackage';
import { routes } from '../../../../shared/utils/routes';

export interface OutdatedDistributeBannerProps {
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>;
}

export const OutdatedDistributeBanner: React.FC<
  OutdatedDistributeBannerProps
> = ({ entries }) => {
  const { orgSlug } = useParams() as { orgSlug?: string };
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

  const { groups, hasOutdated, hasIneligibleTargets, hasInProgress } =
    useMemo(() => {
      const collected: DeployByTargetGroup[] = [];
      let outdated = false;
      let ineligible = false;
      let inProgress = false;
      sections.forEach((section) => {
        const eligible = providersWithToken.has(section.gitRepo.providerId);
        section.targets.forEach((target) => {
          if (target.outdatedPackageIds.length === 0) return;
          outdated = true;

          const inProgressPackageIds = new Set<PackageId>(
            target.packageGroups
              .filter(
                (group) =>
                  group.lastDistributionStatus ===
                  DistributionStatus.in_progress,
              )
              .map((group) => group.packageId),
          );
          const eligiblePackageIds = target.outdatedPackageIds.filter(
            (id) => !inProgressPackageIds.has(id),
          );
          if (eligiblePackageIds.length < target.outdatedPackageIds.length) {
            inProgress = true;
          }

          if (eligiblePackageIds.length === 0) return;

          if (eligible) {
            collected.push({
              targetId: target.id,
              packageIds: eligiblePackageIds,
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
        hasInProgress: inProgress,
      };
    }, [sections, providersWithToken]);

  if (!hasOutdated) {
    return null;
  }

  const hasNoEligibleTargets = groups.length === 0;
  let disabledTooltip: string | undefined;
  if (hasNoEligibleTargets) {
    if (hasInProgress) {
      disabledTooltip = 'Outdated packages are being distributed';
    } else if (hasIneligibleTargets) {
      disabledTooltip =
        'Outdated targets are not configured for in-app distribution. Use `packmind-cli install` to distribute.';
    }
  }

  return (
    <PMAlert.Root status="info">
      <PMHStack justify="space-between" align="center" width="full" gap={4}>
        <PMHStack align="start">
          <PMAlert.Indicator />
          <PMVStack align="start" gap={1}>
            <PMAlert.Title>Some targets need distribution.</PMAlert.Title>
            {orgSlug && (
              <PMAlert.Description>
                Or schedule it automatically —{' '}
                <PMLink href={routes.org.toSetupAutoUpdate(orgSlug)}>
                  set up Auto-update
                </PMLink>
                .
              </PMAlert.Description>
            )}
          </PMVStack>
        </PMHStack>
        {!isProvidersLoading && (
          <BatchDistributeButton
            label="Distribute all"
            groups={groups}
            variant="primary"
            disabled={hasNoEligibleTargets}
            disabledTooltip={disabledTooltip}
          />
        )}
      </PMHStack>
    </PMAlert.Root>
  );
};
