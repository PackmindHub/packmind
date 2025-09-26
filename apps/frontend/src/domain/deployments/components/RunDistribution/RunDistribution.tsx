import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  TargetId,
  TargetWithRepository,
  RecipesDeployment,
  StandardsDeployment,
  OrganizationId,
} from '@packmind/shared';
import { useDeployRecipe, useDeployStandard } from '../../hooks';
import { Recipe } from '@packmind/recipes/types';
import { useGetTargetsByOrganizationQuery } from '../../api/queries/DeploymentsQueries';
import { RunDistributionBodyImpl } from './RunDistributionBody';
import { RunDistributionCTAImpl } from './RunDistributionCTA';
import { Standard } from '@packmind/standards/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

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
  onDistributionComplete?: (deploymentResults?: {
    recipesDeployments: RecipesDeployment[];
    standardsDeployments: StandardsDeployment[];
  }) => void;
  children?: React.ReactNode;
}

const RunDistributionComponent: React.FC<RunDistributionProps> = ({
  selectedRecipes,
  selectedStandards,
  onDistributionComplete,
  children,
}) => {
  const { deployRecipes, isDeploying: isRecipesDeploying } = useDeployRecipe();
  const { deployStandards, isDeploying: isStandardsDeploying } =
    useDeployStandard();
  const [deploymentError, setDeploymentError] = useState<Error | null>(null);
  const { organization } = useAuthContext();
  const {
    data: targetsList = [],
    isLoading: targetsLoading,
    isError: targetsError,
  } = useGetTargetsByOrganizationQuery(
    organization?.id || ('' as OrganizationId),
  );

  const [selectedTargetIds, setSelectedTargetIds] = useState<TargetId[]>([]);
  const canRunDistribution =
    (selectedRecipes.length > 0 || selectedStandards.length > 0) &&
    selectedTargetIds.length > 0 &&
    !isRecipesDeploying;

  const deploy = React.useCallback(async () => {
    try {
      let recipesDeployments: RecipesDeployment[] = [];
      let standardsDeployments: StandardsDeployment[] = [];

      if (selectedRecipes.length > 0) {
        recipesDeployments = await deployRecipes(
          { recipes: selectedRecipes },
          selectedTargetIds,
        );
      }

      if (selectedStandards.length > 0) {
        standardsDeployments = await deployStandards(
          { standards: selectedStandards },
          selectedTargetIds,
        );
      }
      setDeploymentError(null);
      onDistributionComplete?.({ recipesDeployments, standardsDeployments });
    } catch (e: unknown) {
      console.error('Deployment failed:', e);
      if (e instanceof Error) {
        setDeploymentError(e);
      } else {
        setDeploymentError(
          new Error('Deployment has failed. please try again later'),
        );
      }
    }
  }, [
    selectedRecipes,
    selectedStandards,
    onDistributionComplete,
    deployRecipes,
    selectedTargetIds,
    deployStandards,
  ]);

  const value = useMemo<RunDistributionCtxType>(
    () => ({
      targetsList,
      targetsLoading,
      targetsError,
      selectedTargetIds,
      setSelectedTargetIds,
      isDeploying: isRecipesDeploying || isStandardsDeploying,
      deploy,
      deploymentError,
      canRunDistribution,
    }),
    [
      targetsList,
      targetsLoading,
      targetsError,
      selectedTargetIds,
      setSelectedTargetIds,
      isRecipesDeploying,
      isStandardsDeploying,
      deploy,
      deploymentError,
      canRunDistribution,
    ],
  );

  return (
    <RunDistributionCtx.Provider value={value}>
      {children}
    </RunDistributionCtx.Provider>
  );
};

export const RunDistribution =
  RunDistributionComponent as React.FC<RunDistributionProps> & {
    Body: React.FC;
    Cta: React.FC;
  };

RunDistribution.Body = RunDistributionBodyImpl;
RunDistribution.Cta = RunDistributionCTAImpl;
