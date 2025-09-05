import { GitRepo } from '../git';
import { Standard, StandardVersion } from '../standards';

export interface StandardDeploymentOverview {
  repositories: RepositoryStandardDeploymentStatus[];
  standards: StandardDeploymentStatus[];
}

export interface RepositoryStandardDeploymentStatus {
  gitRepo: GitRepo;
  deployedStandards: DeployedStandardInfo[];
  hasOutdatedStandards: boolean;
}

export interface DeployedStandardInfo {
  standard: Standard;
  deployedVersion: StandardVersion;
  latestVersion: StandardVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface StandardDeploymentStatus {
  standard: Standard;
  latestVersion: StandardVersion;
  deployments: RepositoryStandardDeploymentInfo[];
  hasOutdatedDeployments: boolean;
}

export interface RepositoryStandardDeploymentInfo {
  gitRepo: GitRepo;
  deployedVersion: StandardVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}
