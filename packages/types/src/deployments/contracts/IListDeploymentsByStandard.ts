import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardId } from '../../standards/StandardId';
import { StandardsDeployment } from '../StandardsDeployment';

export type ListDeploymentsByStandardCommand = PackmindCommand & {
  standardId: StandardId;
};

export type IListDeploymentsByStandard = IUseCase<
  ListDeploymentsByStandardCommand,
  StandardsDeployment[]
>;
