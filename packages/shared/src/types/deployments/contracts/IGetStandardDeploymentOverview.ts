import { IUseCase, PackmindCommand } from '@packmind/types';
import { StandardDeploymentOverview } from '../StandardDeploymentOverview';

export type GetStandardDeploymentOverviewCommand = PackmindCommand;

export type IGetStandardDeploymentOverview = IUseCase<
  GetStandardDeploymentOverviewCommand,
  StandardDeploymentOverview
>;
