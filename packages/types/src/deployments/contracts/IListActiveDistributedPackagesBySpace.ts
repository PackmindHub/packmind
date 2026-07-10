import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { GitRepo } from '../../git/GitRepo';
import { TargetId } from '../TargetId';
import { Package, PackageId } from '../Package';
import { Target } from '../Target';
import { DistributionStatus } from '../DistributionStatus';
import { CommandId } from '../../commands';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { DeployedStandardTargetInfo } from '../StandardDeploymentOverview';
import { DeployedSkillTargetInfo } from '../SkillDeploymentOverview';
import { DeployedCommandTargetInfo } from './IGetDeploymentOverview';

export type ListActiveDistributedPackagesBySpaceCommand = SpaceMemberCommand;

export type PackageArtifactCounts = {
  recipes: number;
  // Command-named twin of `recipes` (superset for recipes→commands rename); same value.
  commands: number;
  standards: number;
  skills: number;
};

export type PendingCommandInfo = {
  id: CommandId;
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
  deployedRecipes: DeployedCommandTargetInfo[];
  // Command-named twin of `deployedRecipes` (superset); same value.
  deployedCommands: DeployedCommandTargetInfo[];
  deployedStandards: DeployedStandardTargetInfo[];
  deployedSkills: DeployedSkillTargetInfo[];
  pendingRecipes: PendingCommandInfo[];
  // Command-named twin of `pendingRecipes` (superset); same value.
  pendingCommands: PendingCommandInfo[];
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
