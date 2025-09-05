import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardId } from '../../standards';
import { StandardsDeployment } from '../../deployments';

export type ListDeploymentsByStandardCommand = PackmindCommand & {
  standardId: StandardId;
};

export type IListDeploymentsByStandard = IUseCase<
  ListDeploymentsByStandardCommand,
  StandardsDeployment[]
>;
