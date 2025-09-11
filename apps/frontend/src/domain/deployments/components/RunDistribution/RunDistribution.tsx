import React, { createContext, useContext, useMemo, useState } from 'react';
import { GitRepoId } from '@packmind/git';
import { useDeployRecipe } from '../../hooks';
import { Recipe } from '@packmind/recipes/types';
import { useGetGitReposQuery } from '../../../git/api/queries/GitRepoQueries';
import { Repository } from '../../../git/api/gateways/IRepositoryGateway';
import { RunDistributionBodyImpl } from './RunDistributionBody';
import { RunDistributionCTAImpl } from './RunDistributionCTA';

type RunDistributionCtxType = {
  repositoriesList: Repository[];
  repositoriesLoading: boolean;
  repositoriesError: boolean;
  selectedRepoIds: GitRepoId[];
  setSelectedRepoIds: React.Dispatch<React.SetStateAction<GitRepoId[]>>;
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
  onDistributionComplete?: () => void;
  children?: React.ReactNode;
}

const RunDistributionComponent: React.FC<RunDistributionProps> = ({
  selectedRecipes,
  onDistributionComplete,
  children,
}) => {
  const { deployRecipes, isDeploying } = useDeployRecipe();
  const [deploymentError, setDeploymentError] = useState<Error | null>(null);
  const {
    data: repositoriesList = [],
    isLoading: repositoriesLoading,
    isError: repositoriesError,
  } = useGetGitReposQuery();

  const [selectedRepoIds, setSelectedRepoIds] = useState<GitRepoId[]>([]);

  const canRunDistribution =
    selectedRecipes.length > 0 && selectedRepoIds.length > 0 && !isDeploying;

  const deploy = React.useCallback(async () => {
    if (selectedRecipes.length === 0) return;

    try {
      await deployRecipes({ recipes: selectedRecipes }, selectedRepoIds);
      onDistributionComplete?.();
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
  }, [deployRecipes, selectedRecipes, onDistributionComplete, selectedRepoIds]);

  const value = useMemo<RunDistributionCtxType>(
    () => ({
      repositoriesList,
      repositoriesLoading,
      repositoriesError,
      selectedRepoIds,
      setSelectedRepoIds,
      isDeploying,
      deploy,
      deploymentError,
      canRunDistribution,
    }),
    [
      repositoriesList,
      repositoriesLoading,
      repositoriesError,
      selectedRepoIds,
      isDeploying,
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
