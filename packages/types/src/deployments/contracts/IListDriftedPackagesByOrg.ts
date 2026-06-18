import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { PackageId } from '../Package';

export type ListDriftedPackagesByOrgCommand = PackmindCommand;

export type DriftedPackageInfo = {
  packageId: PackageId;
  packageName: string;
  spaceId: SpaceId;
  spaceSlug: string;
  spaceName: string;
  behindDistributions: number;
  lastUpdatedAt: string | null;
};

export type ListDriftedPackagesByOrgResponse = DriftedPackageInfo[];

export type IListDriftedPackagesByOrgUseCase = IUseCase<
  ListDriftedPackagesByOrgCommand,
  ListDriftedPackagesByOrgResponse
>;
