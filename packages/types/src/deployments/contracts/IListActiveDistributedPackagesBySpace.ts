import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { GitRepo } from '../../git/GitRepo';
import { TargetId } from '../TargetId';
import { PackageId } from '../Package';
import { Target } from '../Target';
import { DistributionStatus } from '../DistributionStatus';
import { DeployedStandardTargetInfo } from '../StandardDeploymentOverview';
import { DeployedSkillTargetInfo } from '../SkillDeploymentOverview';
import { DeployedRecipeTargetInfo } from './IGetDeploymentOverview';

export type ListActiveDistributedPackagesBySpaceCommand = SpaceMemberCommand;

export type PackageArtifactCounts = {
  recipes: number;
  standards: number;
  skills: number;
};

export type ActiveDistributedPackage = {
  packageId: PackageId;
  lastDistributionStatus: DistributionStatus;
  lastDistributedAt: string;
};

export type ActiveDistributedPackagesByTarget = {
  targetId: TargetId;
  target: Target;
  gitRepo: GitRepo | null;
  packages: ActiveDistributedPackage[];
  outdatedStandards: DeployedStandardTargetInfo[];
  outdatedRecipes: DeployedRecipeTargetInfo[];
  outdatedSkills: DeployedSkillTargetInfo[];
};

export type ListActiveDistributedPackagesBySpaceResponse =
  ActiveDistributedPackagesByTarget[];

export type IListActiveDistributedPackagesBySpaceUseCase = IUseCase<
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse
>;
