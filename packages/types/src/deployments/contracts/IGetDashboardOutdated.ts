import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { GitRepo } from '../../git/GitRepo';
import { Target } from '../Target';
import { DeployedStandardTargetInfo } from '../StandardDeploymentOverview';
import { DeployedRecipeTargetInfo } from './IGetDeploymentOverview';

export type GetDashboardOutdatedCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type DashboardOutdatedTarget = {
  target: Target;
  gitRepo: GitRepo;
  outdatedStandards: DeployedStandardTargetInfo[];
  outdatedRecipes: DeployedRecipeTargetInfo[];
};

export type DashboardOutdatedResponse = {
  targets: DashboardOutdatedTarget[];
};

export type IGetDashboardOutdated = IUseCase<
  GetDashboardOutdatedCommand,
  DashboardOutdatedResponse
>;
