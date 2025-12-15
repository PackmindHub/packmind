import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { PackageId } from '../Package';

export type RemovePackageFromTargetsCommand = PackmindCommand & {
  packageId: PackageId;
  targetIds: TargetId[];
};

export type RemovePackageFromTargetsResult = {
  targetId: TargetId;
  success: boolean;
  error?: string;
};

export type RemovePackageFromTargetsResponse = {
  results: RemovePackageFromTargetsResult[];
};

export type IRemovePackageFromTargetsUseCase = IUseCase<
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse
>;
