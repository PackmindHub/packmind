import { GitRepo } from '../git/GitRepo';
import { Skill } from '../skills/Skill';
import { SkillVersion } from '../skills/SkillVersion';
import { Target } from './Target';

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
  deployments: RepositorySkillDeploymentInfo[];
  targetDeployments: TargetSkillDeploymentInfo[];
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
  gitRepo: GitRepo;
  deployedVersion: SkillVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}
