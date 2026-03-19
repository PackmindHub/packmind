import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { SkillDeploymentOverview } from '../SkillDeploymentOverview';

export type GetSkillDeploymentOverviewCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type IGetSkillDeploymentOverview = IUseCase<
  GetSkillDeploymentOverviewCommand,
  SkillDeploymentOverview
>;
