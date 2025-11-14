import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { PackageId } from '../Package';
import { SpaceId } from '../../spaces/SpaceId';

export type DeletePackageCommand = PackmindCommand & {
  packageId: PackageId;
  spaceId: SpaceId;
};

export type DeletePackageResponse = PackmindResult;

export type IDeletePackageUseCase = IUseCase<
  DeletePackageCommand,
  DeletePackageResponse
>;

export type DeletePackagesBatchCommand = PackmindCommand & {
  packageIds: PackageId[];
  spaceId: SpaceId;
};

export type DeletePackagesBatchResponse = PackmindResult;

export type IDeletePackagesBatchUseCase = IUseCase<
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse
>;
