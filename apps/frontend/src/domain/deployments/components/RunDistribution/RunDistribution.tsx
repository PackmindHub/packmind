import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { UserOrganizationRole } from '@packmind/types';
import {
  TargetId,
  TargetWithRepository,
  RenderModeConfiguration,
  RenderMode,
  DEFAULT_ACTIVE_RENDER_MODES,
  Package,
  PackagesDeployment,
} from '@packmind/types';
import { useDeployPackage } from '../../hooks';
import { Recipe } from '@packmind/types';
import {
  useGetRenderModeConfigurationQuery,
  useGetTargetsByOrganizationQuery,
} from '../../api/queries/DeploymentsQueries';
import { RunDistributionBodyImpl } from './RunDistributionBody';
import { RunDistributionCTAImpl } from './RunDistributionCTA';
import { Standard } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { PMBox, PMHeading, PMSpinner, PMVStack, PMAlert } from '@packmind/ui';
import { RenderingSettings } from '../RenderingSettings/RenderingSettings';
import { useGetGitReposQuery } from '../../../git/api/queries/GitRepoQueries';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';

type RunDistributionCtxType = {
  targetsList: TargetWithRepository[];
  targetsLoading: boolean;
  targetsError: boolean;
  selectedTargetIds: TargetId[];
  setSelectedTargetIds: React.Dispatch<React.SetStateAction<TargetId[]>>;
  isDeploying: boolean;
  deploy: () => Promise<void>;
  deploymentError?: Error | null;
  canRunDistribution: boolean;
  renderModeConfiguration: RenderModeConfiguration | null;
  renderModeConfigurationLoading: boolean;
  renderModeConfigurationError?: Error | null;
  shouldShowRenderingSettings: boolean;
  isRenderModeConfigurationMissing: boolean;
  organizationRole?: UserOrganizationRole;
  activeRenderModes: RenderMode[];
  selectedPackages: Package[];
};

const RunDistributionCtx = createContext<RunDistributionCtxType | null>(null);
export const useRunDistribution = () => {
  const ctx = useContext(RunDistributionCtx);
  if (!ctx)
    throw new Error('RunDistribution.* must be used within <RunDistribution>');
  return ctx;
};

interface RunDistributionProps {
  selectedRecipes: Recipe[];
  selectedStandards: Standard[];
  selectedPackages?: Package[];
  onDistributionComplete?: (deploymentResults: PackagesDeployment[]) => void;
  children?: React.ReactNode;
}

const RunDistributionComponent: React.FC<RunDistributionProps> = ({
  selectedRecipes,
  selectedStandards,
  selectedPackages = [],
  onDistributionComplete,
  children,
}) => {
  const { deployPackages, isDeploying: isPackagesDeploying } =
    useDeployPackage();
  const [deploymentError, setDeploymentError] = useState<Error | null>(null);
  const { organization } = useAuthContext();
  const {
    data: renderModeConfigurationResult,
    isLoading: renderModeConfigurationLoading,
    isError: renderModeConfigurationHasError,
    error: renderModeConfigurationError,
  } = useGetRenderModeConfigurationQuery();
  const {
    data: allTargets = [],
    isLoading: targetsLoading,
    isError: targetsError,
  } = useGetTargetsByOrganizationQuery();

  // Fetch repositories and providers to filter out targets from tokenless providers
  const { data: repositories = [] } = useGetGitReposQuery();
  const { data: providersResponse } = useGetGitProvidersQuery();
  const providers = providersResponse?.providers ?? [];

  // Filter targets to only include those from providers with tokens
  const targetsList = useMemo(() => {
    // Build a map of gitRepoId -> providerId
    const repoToProviderMap = new Map(
      repositories.map((repo) => [repo.id, repo.providerId]),
    );

    // Build a set of providerIds that have tokens
    const providersWithToken = new Set(
      providers.filter((p) => p.hasToken).map((p) => p.id),
    );

    // Filter targets to only those whose repository's provider has a token
    return allTargets.filter((target) => {
      const providerId = repoToProviderMap.get(target.gitRepoId);
      // If we can't find the provider, include the target (safe fallback)
      if (!providerId) return true;
      return providersWithToken.has(providerId);
    });
  }, [allTargets, repositories, providers]);

  const renderModeConfiguration =
    renderModeConfigurationResult?.configuration ?? null;
  const isRenderModeConfigurationMissing =
    !renderModeConfigurationLoading &&
    !renderModeConfigurationHasError &&
    !renderModeConfiguration;
  const organizationRole = organization?.role;
  const isOrganizationAdmin = organizationRole === 'admin';
  const shouldShowRenderingSettings =
    isOrganizationAdmin && isRenderModeConfigurationMissing;
  const activeRenderModes =
    renderModeConfiguration?.activeRenderModes ?? DEFAULT_ACTIVE_RENDER_MODES;

  const [selectedTargetIds, setSelectedTargetIds] = useState<TargetId[]>([]);

  useEffect(() => {
    if (targetsList.length === 1) {
      setSelectedTargetIds([targetsList[0].id]);
    }
  }, [targetsList]);

  const canRunDistribution =
    selectedPackages.length > 0 &&
    selectedTargetIds.length > 0 &&
    !isPackagesDeploying;

  const deploy = React.useCallback(async () => {
    if (!organization) return;

    try {
      const deploymentResults = await deployPackages(
        {
          packages: selectedPackages.map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
          })),
        },
        selectedTargetIds,
      );

      setDeploymentError(null);
      onDistributionComplete?.(deploymentResults);
    } catch (e: unknown) {
      console.error('Distribution failed:', e);
      if (e instanceof Error) {
        setDeploymentError(e);
      } else {
        setDeploymentError(
          new Error('Distribution has failed. please try again later'),
        );
      }
    }
  }, [
    selectedPackages,
    onDistributionComplete,
    deployPackages,
    selectedTargetIds,
    organization,
  ]);

  const value = useMemo<RunDistributionCtxType>(
    () => ({
      targetsList,
      targetsLoading,
      targetsError,
      selectedTargetIds,
      setSelectedTargetIds,
      isDeploying: isPackagesDeploying,
      deploy,
      deploymentError,
      canRunDistribution,
      renderModeConfiguration,
      renderModeConfigurationLoading,
      renderModeConfigurationError:
        (renderModeConfigurationError as Error | null | undefined) ?? null,
      shouldShowRenderingSettings,
      isRenderModeConfigurationMissing,
      organizationRole,
      activeRenderModes,
      selectedPackages,
    }),
    [
      targetsList,
      targetsLoading,
      targetsError,
      selectedTargetIds,
      setSelectedTargetIds,
      isPackagesDeploying,
      deploy,
      deploymentError,
      canRunDistribution,
      renderModeConfiguration,
      renderModeConfigurationLoading,
      renderModeConfigurationError,
      shouldShowRenderingSettings,
      isRenderModeConfigurationMissing,
      organizationRole,
      activeRenderModes,
      selectedPackages,
    ],
  );

  if (renderModeConfigurationLoading) {
    return <PMSpinner />;
  }

  if (renderModeConfigurationHasError) {
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>
          Failed to load render mode settings. Please try again later.
        </PMAlert.Title>
        {renderModeConfigurationError instanceof Error && (
          <PMAlert.Description>
            {renderModeConfigurationError.message}
          </PMAlert.Description>
        )}
      </PMAlert.Root>
    );
  }

  const content = shouldShowRenderingSettings ? (
    <RenderingSettings>{children}</RenderingSettings>
  ) : (
    <>{children}</>
  );

  return (
    <RunDistributionCtx.Provider value={value}>
      {content}
    </RunDistributionCtx.Provider>
  );
};

export const RunDistribution =
  RunDistributionComponent as React.FC<RunDistributionProps> & {
    Body: React.FC;
    Cta: React.FC;
  };

const RunDistributionBody: React.FC = () => {
  const { shouldShowRenderingSettings } = useRunDistribution();

  if (shouldShowRenderingSettings) {
    return (
      <PMVStack gap={4} align="stretch">
        <PMHeading level="h5">Configure render modes</PMHeading>
        <PMBox>
          <RenderingSettings.Body />
        </PMBox>
      </PMVStack>
    );
  }

  return <RunDistributionBodyImpl />;
};

RunDistribution.Body = RunDistributionBody;

const RunDistributionCta: React.FC = () => {
  const { shouldShowRenderingSettings } = useRunDistribution();

  if (shouldShowRenderingSettings) {
    return <RenderingSettings.Cta />;
  }

  return <RunDistributionCTAImpl />;
};

RunDistribution.Cta = RunDistributionCta;
