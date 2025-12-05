import React, { createContext, useContext, useMemo, useState } from 'react';
import { OrganizationId, UserOrganizationRole } from '@packmind/types';
import {
  TargetId,
  TargetWithRepository,
  Distribution,
  RenderModeConfiguration,
  RenderMode,
  DEFAULT_ACTIVE_RENDER_MODES,
  Package,
} from '@packmind/types';
import {
  useDeployRecipe,
  useDeployStandard,
  useDeployPackage,
} from '../../hooks';
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
  onDistributionComplete?: (deploymentResults?: {
    recipesDistributions: Distribution[];
    standardsDistributions: Distribution[];
  }) => void;
  children?: React.ReactNode;
}

const RunDistributionComponent: React.FC<RunDistributionProps> = ({
  selectedRecipes,
  selectedStandards,
  selectedPackages = [],
  onDistributionComplete,
  children,
}) => {
  const { deployRecipes, isDeploying: isRecipesDeploying } = useDeployRecipe();
  const { deployStandards, isDeploying: isStandardsDeploying } =
    useDeployStandard();
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
  const canRunDistribution =
    (selectedRecipes.length > 0 ||
      selectedStandards.length > 0 ||
      selectedPackages.length > 0) &&
    selectedTargetIds.length > 0 &&
    !isRecipesDeploying &&
    !isPackagesDeploying;

  const deploy = React.useCallback(async () => {
    if (!organization) return;

    try {
      const recipesDistributions: Distribution[] = [];
      const standardsDistributions: Distribution[] = [];

      if (selectedPackages.length > 0) {
        // Deploy packages - results are PackagesDeployment[], not mixed with other types
        await deployPackages(
          {
            packages: selectedPackages.map((pkg) => ({
              id: pkg.id,
              name: pkg.name,
            })),
          },
          selectedTargetIds,
        );
        // Package deployments are tracked separately through the distributions system
        // No need to add to recipesDistributions or standardsDistributions
      }

      if (selectedRecipes.length > 0) {
        const recipeResults = await deployRecipes(
          {
            recipes: selectedRecipes.map((recipe) => ({
              ...recipe,
              organizationId: organization.id,
            })),
          },
          selectedTargetIds,
        );
        recipesDistributions.push(...recipeResults);
      }

      if (selectedStandards.length > 0) {
        const standardResults = await deployStandards(
          { standards: selectedStandards },
          selectedTargetIds,
        );
        standardsDistributions.push(...standardResults);
      }
      setDeploymentError(null);
      onDistributionComplete?.({
        recipesDistributions,
        standardsDistributions,
      });
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
    selectedRecipes,
    selectedStandards,
    selectedPackages,
    onDistributionComplete,
    deployRecipes,
    deployPackages,
    selectedTargetIds,
    deployStandards,
    organization,
  ]);

  const value = useMemo<RunDistributionCtxType>(
    () => ({
      targetsList,
      targetsLoading,
      targetsError,
      selectedTargetIds,
      setSelectedTargetIds,
      isDeploying:
        isRecipesDeploying || isStandardsDeploying || isPackagesDeploying,
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
      isRecipesDeploying,
      isStandardsDeploying,
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
