import { Distribution } from '../Distribution';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { PackageId } from '../Package';

export type ListDeploymentsByPackageCommand = PackmindCommand & {
  packageId: PackageId;
};

export type IListDeploymentsByPackage = IUseCase<
  ListDeploymentsByPackageCommand,
  Distribution[]
>;
