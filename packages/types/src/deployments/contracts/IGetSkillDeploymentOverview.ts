import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SkillDeploymentOverview } from '../SkillDeploymentOverview';

export type GetSkillDeploymentOverviewCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type IGetSkillDeploymentOverview = IUseCase<
  GetSkillDeploymentOverviewCommand,
  SkillDeploymentOverview
>;
