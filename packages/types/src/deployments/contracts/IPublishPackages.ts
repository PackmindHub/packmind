import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { PackagesDeployment } from '../PackagesDeployment';
import { PackageId } from '../Package';

export type PublishPackagesCommand = PackmindCommand & {
  targetIds: TargetId[];
  packageIds: PackageId[];
};

export type IPublishPackages = IUseCase<
  PublishPackagesCommand,
  PackagesDeployment[]
>;
