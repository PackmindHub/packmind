import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { PackageId } from '../Package';

export type ListActiveDistributedPackagesBySpaceCommand = SpaceMemberCommand;

export type ActiveDistributedPackagesByTarget = {
  targetId: TargetId;
  packageIds: PackageId[];
};

export type ListActiveDistributedPackagesBySpaceResponse =
  ActiveDistributedPackagesByTarget[];

export type IListActiveDistributedPackagesBySpaceUseCase = IUseCase<
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse
>;
