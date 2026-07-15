import { GitRepo } from '../../git/GitRepo';
import { Command } from '../../commands/Command';
import { CommandVersion } from '../../commands/CommandVersion';
import { Target } from '../Target';

export interface RepositoryDeploymentStatus {
  gitRepo: GitRepo;
  deployedRecipes: DeployedCommandInfo[];
  hasOutdatedRecipes: boolean;
}

export interface TargetDeploymentStatus {
  target: Target;
  gitRepo: GitRepo;
  deployedRecipes: DeployedCommandTargetInfo[];
  hasOutdatedRecipes: boolean;
}

export interface DeployedCommandInfo {
  recipe: Command;
  deployedVersion: CommandVersion;
  latestVersion: CommandVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface DeployedCommandTargetInfo {
  recipe: Command;
  // Command-named twin of `recipe` (superset for recipes→commands rename); same value.
  command: Command;
  deployedVersion: CommandVersion;
  latestVersion: CommandVersion;
  isUpToDate: boolean;
  deploymentDate: string;
  isDeleted?: boolean;
}

export interface CommandDeploymentStatus {
  recipe: Command;
  // Command-named twin of `recipe` (superset for recipes→commands rename); same value.
  command: Command;
  latestVersion: CommandVersion;
  deployments: RepositoryDeploymentInfo[];
  targetDeployments: TargetDeploymentInfo[];
  hasOutdatedDeployments: boolean;
  isDeleted?: boolean;
}

export interface RepositoryDeploymentInfo {
  gitRepo: GitRepo;
  deployedVersion: CommandVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface TargetDeploymentInfo {
  target: Target;
  gitRepo: GitRepo;
  deployedVersion: CommandVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}
