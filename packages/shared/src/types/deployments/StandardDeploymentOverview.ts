import { GitRepo } from '../git';
import { Standard, StandardVersion } from '../standards';
import { Target } from '.';

export interface StandardDeploymentOverview {
  repositories: RepositoryStandardDeploymentStatus[]; // Legacy support
  targets: TargetStandardDeploymentStatus[]; // New target-centric view
  standards: StandardDeploymentStatus[];
}

export interface RepositoryStandardDeploymentStatus {
  gitRepo: GitRepo;
  deployedStandards: DeployedStandardInfo[];
  hasOutdatedStandards: boolean;
}

export interface TargetStandardDeploymentStatus {
  target: Target;
  gitRepo: GitRepo; // Include repo info for display
  deployedStandards: DeployedStandardTargetInfo[];
  hasOutdatedStandards: boolean;
}

export interface DeployedStandardInfo {
  standard: Standard;
  deployedVersion: StandardVersion;
  latestVersion: StandardVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface DeployedStandardTargetInfo {
  standard: Standard;
  deployedVersion: StandardVersion;
  latestVersion: StandardVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface StandardDeploymentStatus {
  standard: Standard;
  latestVersion: StandardVersion;
  deployments: RepositoryStandardDeploymentInfo[]; // Legacy support
  targetDeployments: TargetStandardDeploymentInfo[]; // New target-based deployments
  hasOutdatedDeployments: boolean;
}

export interface RepositoryStandardDeploymentInfo {
  gitRepo: GitRepo;
  deployedVersion: StandardVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface TargetStandardDeploymentInfo {
  target: Target;
  gitRepo: GitRepo; // Include repo info for display
  deployedVersion: StandardVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}
