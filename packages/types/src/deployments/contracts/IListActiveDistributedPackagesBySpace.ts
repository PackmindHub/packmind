import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { GitRepo } from '../../git/GitRepo';
import { TargetId } from '../TargetId';
import { Package, PackageId } from '../Package';
import { Target } from '../Target';
import { DistributionStatus } from '../DistributionStatus';
import { RecipeId } from '../../recipes';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { DeployedStandardTargetInfo } from '../StandardDeploymentOverview';
import { DeployedSkillTargetInfo } from '../SkillDeploymentOverview';
import { DeployedRecipeTargetInfo } from './IGetDeploymentOverview';

export type ListActiveDistributedPackagesBySpaceCommand = SpaceMemberCommand;

export type PackageArtifactCounts = {
  recipes: number;
  standards: number;
  skills: number;
};

export type PendingRecipeInfo = {
  id: RecipeId;
  name: string;
  slug: string;
};

export type PendingStandardInfo = {
  id: StandardId;
  name: string;
  slug: string;
};

export type PendingSkillInfo = {
  id: SkillId;
  name: string;
  slug: string;
};

export type ActiveDistributedPackage = {
  packageId: PackageId;
  package: Package;
  lastDistributionStatus: DistributionStatus;
  lastDistributedAt: string;
  deployedRecipes: DeployedRecipeTargetInfo[];
  deployedStandards: DeployedStandardTargetInfo[];
  deployedSkills: DeployedSkillTargetInfo[];
  pendingRecipes: PendingRecipeInfo[];
  pendingStandards: PendingStandardInfo[];
  pendingSkills: PendingSkillInfo[];
};

export type ActiveDistributedPackagesByTarget = {
  targetId: TargetId;
  target: Target;
  gitRepo: GitRepo | null;
  packages: ActiveDistributedPackage[];
};

export type ListActiveDistributedPackagesBySpaceResponse =
  ActiveDistributedPackagesByTarget[];

export type IListActiveDistributedPackagesBySpaceUseCase = IUseCase<
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse
>;
