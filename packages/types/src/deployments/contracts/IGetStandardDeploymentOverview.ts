import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardDeploymentOverview } from '../StandardDeploymentOverview';

export type GetStandardDeploymentOverviewCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type IGetStandardDeploymentOverview = IUseCase<
  GetStandardDeploymentOverviewCommand,
  StandardDeploymentOverview
>;
