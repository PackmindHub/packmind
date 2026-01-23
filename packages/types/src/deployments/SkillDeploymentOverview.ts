import { GitRepo } from '../git/GitRepo';
import { Skill } from '../skills/Skill';
import { SkillVersion } from '../skills/SkillVersion';
import { Target } from './Target';

export interface SkillDeploymentOverview {
  repositories: RepositorySkillDeploymentStatus[]; // Legacy support
  targets: TargetSkillDeploymentStatus[]; // New target-centric view
  skills: SkillDeploymentStatus[];
}

export interface RepositorySkillDeploymentStatus {
  gitRepo: GitRepo;
  deployedSkills: DeployedSkillInfo[];
  hasOutdatedSkills: boolean;
}

export interface TargetSkillDeploymentStatus {
  target: Target;
  gitRepo: GitRepo; // Include repo info for display
  deployedSkills: DeployedSkillTargetInfo[];
  hasOutdatedSkills: boolean;
}

export interface DeployedSkillInfo {
  skill: Skill;
  deployedVersion: SkillVersion;
  latestVersion: SkillVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface DeployedSkillTargetInfo {
  skill: Skill;
  deployedVersion: SkillVersion;
  latestVersion: SkillVersion;
  isUpToDate: boolean;
  deploymentDate: string;
  isDeleted?: boolean;
}

export interface SkillDeploymentStatus {
  skill: Skill;
  latestVersion: SkillVersion;
  deployments: RepositorySkillDeploymentInfo[]; // Legacy support
  targetDeployments: TargetSkillDeploymentInfo[]; // New target-based deployments
  hasOutdatedDeployments: boolean;
  isDeleted?: boolean;
}

export interface RepositorySkillDeploymentInfo {
  gitRepo: GitRepo;
  deployedVersion: SkillVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface TargetSkillDeploymentInfo {
  target: Target;
  gitRepo: GitRepo; // Include repo info for display
  deployedVersion: SkillVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}
