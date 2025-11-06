import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardDeploymentOverview } from '../StandardDeploymentOverview';

export type GetStandardDeploymentOverviewCommand = PackmindCommand;

export type IGetStandardDeploymentOverview = IUseCase<
  GetStandardDeploymentOverviewCommand,
  StandardDeploymentOverview
>;
